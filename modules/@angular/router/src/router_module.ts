/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {APP_BASE_HREF, LOCATION_INITIALIZED, HashLocationStrategy, Location, LocationStrategy, PathLocationStrategy, PlatformLocation} from '@angular/common';
import {ANALYZE_FOR_ENTRY_COMPONENTS, APP_BOOTSTRAP_LISTENER, APP_INITIALIZER, ApplicationRef, Compiler, ComponentRef, Inject, Injector, Injectable, ModuleWithProviders, NgModule, NgModuleFactoryLoader, OpaqueToken, Optional, Provider, SkipSelf, SystemJsNgModuleLoader} from '@angular/core';
import {Subject} from 'rxjs/Subject';
import {of} from 'rxjs/observable/of';

import {Route, Routes} from './config';
import {RouterLink, RouterLinkWithHref} from './directives/router_link';
import {RouterLinkActive} from './directives/router_link_active';
import {RouterOutlet} from './directives/router_outlet';
import {ErrorHandler, Router} from './router';
import {ROUTES} from './router_config_loader';
import {RouterOutletMap} from './router_outlet_map';
import {NoPreloading, PreloadAllModules, PreloadingStrategy, RouterPreloader} from './router_preloader';
import {ActivatedRoute, RouterStateSnapshot} from './router_state';
import {DefaultUrlSerializer, UrlSerializer} from './url_tree';
import {flatten} from './utils/collection';



/**
 * @whatItDoes Contains a list of directives
 * @stable
 */
const ROUTER_DIRECTIVES = [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive];

/**
 * @whatItDoes Is used in DI to configure the router.
 * @stable
 */
export const ROUTER_CONFIGURATION = new OpaqueToken('ROUTER_CONFIGURATION');

/**
 * @docsNotRequired
 */
export const ROUTER_FORROOT_GUARD = new OpaqueToken('ROUTER_FORROOT_GUARD');

const pathLocationStrategy = {
  provide: LocationStrategy,
  useClass: PathLocationStrategy
};
const hashLocationStrategy = {
  provide: LocationStrategy,
  useClass: HashLocationStrategy
};

export const ROUTER_PROVIDERS: Provider[] = [
  Location, {provide: UrlSerializer, useClass: DefaultUrlSerializer}, {
    provide: Router,
    useFactory: setupRouter,
    deps: [
      ApplicationRef, UrlSerializer, RouterOutletMap, Location, Injector, NgModuleFactoryLoader,
      Compiler, ROUTES, ROUTER_CONFIGURATION
    ]
  },
  RouterOutletMap, {provide: ActivatedRoute, useFactory: rootRoute, deps: [Router]},
  {provide: NgModuleFactoryLoader, useClass: SystemJsNgModuleLoader}, RouterPreloader, NoPreloading,
  PreloadAllModules, {provide: ROUTER_CONFIGURATION, useValue: {enableTracing: false}}
];

/**
 * @whatItDoes Adds router directives and providers.
 *
 * @howToUse
 *
 * RouterModule can be imported multiple times: once per lazily-loaded bundle.
 * Since the router deals with a global shared resource--location, we cannot have
 * more than one router service active.
 *
 * That is why there are two ways to create the module: `RouterModule.forRoot` and
 * `RouterModule.forChild`.
 *
 * * `forRoot` creates a module that contains all the directives, the given routes, and the router
 * service itself.
 * * `forChild` creates a module that contains all the directives and the given routes, but does not
 * include
 * the router service.
 *
 * When registered at the root, the module should be used as follows
 *
 * ```
 * @NgModule({
 *   imports: [RouterModule.forRoot(ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 * For submodules and lazy loaded submodules the module should be used as follows:
 *
 * ```
 * @NgModule({
 *   imports: [RouterModule.forChild(ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 * @description
 *
 * Managing state transitions is one of the hardest parts of building applications. This is
 * especially true on the web, where you also need to ensure that the state is reflected in the URL.
 * In addition, we often want to split applications into multiple bundles and load them on demand.
 * Doing this transparently is not trivial.
 *
 * The Angular 2 router solves these problems. Using the router, you can declaratively specify
 * application states, manage state transitions while taking care of the URL, and load bundles on
 * demand.
 *
 * [Read this developer guide](https://angular.io/docs/ts/latest/guide/router.html) to get an
 * overview of how the router should be used.
 *
 * @stable
 */
@NgModule({declarations: ROUTER_DIRECTIVES, exports: ROUTER_DIRECTIVES})
export class RouterModule {
  constructor(@Optional() @Inject(ROUTER_FORROOT_GUARD) guard: any) {}

  /**
   * Creates a module with all the router providers and directives. It also optionally sets up an
   * application listener to perform an initial navigation.
   *
   * Options:
   * * `enableTracing` makes the router log all its internal events to the console.
   * * `useHash` enables the location strategy that uses the URL fragment instead of the history
   * API.
   * * `initialNavigation` disables the initial navigation.
   * * `errorHandler` provides a custom error handler.
   */
  static forRoot(routes: Routes, config?: ExtraOptions): ModuleWithProviders {
    return {
      ngModule: RouterModule,
      providers: [
        ROUTER_PROVIDERS, provideRoutes(routes), {
          provide: ROUTER_FORROOT_GUARD,
          useFactory: provideForRootGuard,
          deps: [[Router, new Optional(), new SkipSelf()]]
        },
        {provide: ROUTER_CONFIGURATION, useValue: config ? config : {}}, {
          provide: LocationStrategy,
          useFactory: provideLocationStrategy,
          deps: [
            PlatformLocation, [new Inject(APP_BASE_HREF), new Optional()], ROUTER_CONFIGURATION
          ]
        },
        {
          provide: PreloadingStrategy,
          useExisting: config && config.preloadingStrategy ? config.preloadingStrategy :
                                                             NoPreloading
        },
        provideRouterInitializer()
      ]
    };
  }

  /**
   * Creates a module with all the router directives and a provider registering routes.
   */
  static forChild(routes: Routes): ModuleWithProviders {
    return {ngModule: RouterModule, providers: [provideRoutes(routes)]};
  }
}

export function provideLocationStrategy(
    platformLocationStrategy: PlatformLocation, baseHref: string, options: ExtraOptions = {}) {
  return options.useHash ? new HashLocationStrategy(platformLocationStrategy, baseHref) :
                           new PathLocationStrategy(platformLocationStrategy, baseHref);
}

export function provideForRootGuard(router: Router): any {
  if (router) {
    throw new Error(
        `RouterModule.forRoot() called twice. Lazy loaded modules should use RouterModule.forChild() instead.`);
  }
  return 'guarded';
}

/**
 * @whatItDoes Registers routes.
 *
 * @howToUse
 *
 * ```
 * @NgModule({
 *   imports: [RouterModule.forChild(ROUTES)],
 *   providers: [provideRoutes(EXTRA_ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 * @stable
 */
export function provideRoutes(routes: Routes): any {
  return [
    {provide: ANALYZE_FOR_ENTRY_COMPONENTS, multi: true, useValue: routes},
    {provide: ROUTES, multi: true, useValue: routes}
  ];
}


/**
 * @whatItDoes Represents options to configure the router.
 *
 * @stable
 */
export interface ExtraOptions {
  /**
   * Makes the router log all its internal events to the console.
   */
  enableTracing?: boolean;

  /**
   * Enables the location strategy that uses the URL fragment instead of the history API.
   */
  useHash?: boolean;

  /**
   * Disables the initial navigation.
   */
  initialNavigation?: boolean;

  /**
   * A custom error handler.
   */
  errorHandler?: ErrorHandler;

  /**
   * Configures a preloading strategy. See {@link PreloadAllModules}.
   */
  preloadingStrategy?: any;
}

export function setupRouter(
    ref: ApplicationRef, urlSerializer: UrlSerializer, outletMap: RouterOutletMap,
    location: Location, injector: Injector, loader: NgModuleFactoryLoader, compiler: Compiler,
    config: Route[][], opts: ExtraOptions = {}) {
  const r = new Router(
      null, urlSerializer, outletMap, location, injector, loader, compiler, flatten(config));

  if (opts.errorHandler) {
    r.errorHandler = opts.errorHandler;
  }

  if (opts.enableTracing) {
    r.events.subscribe(e => {
      console.group(`Router Event: ${(<any>e.constructor).name}`);
      console.log(e.toString());
      console.log(e);
      console.groupEnd();
    });
  }

  return r;
}

export function rootRoute(router: Router): ActivatedRoute {
  return router.routerState.root;
}

/**
 * To initialize the router properly we need to do in two steps:
 *
 * We need to start the navigation in a APP_INITIALIZER to block the bootstrap if
 * a resolver or a guards executes asynchronously. Second, we need to actually run
 * activation in a BOOTSTRAP_LISTENER. We utilize an experimental afterPreactivation
 * hook provided by the router to do that.
 *
 * The router navigation starts, reaches the point when preactivation is done, and then
 * pauses. It waits for the hook to be resolved. We then resolve it only in a bootstrap listener.
 */
@Injectable()
export class RouterInitializer {
  private initSnapshot: RouterStateSnapshot;
  private resultOfPreactivationDone = new Subject<RouterStateSnapshot>();

  constructor(private injector: Injector) {}

  appInitializer(): Promise<any> {
    const p: Promise<any> = this.injector.get(LOCATION_INITIALIZED, new Promise(res => res()));
    return p.then(() => {
      let resolve: any = null;
      const res = new Promise(r => resolve = r);
      const router = this.injector.get(Router);
      const opts = this.injector.get(ROUTER_CONFIGURATION);

      if (opts.initialNavigation === false) {
        router.setUpLocationChangeListener();
      } else {
        router.hooks.afterPreactivation = (s: any) => {
          // only the initial navigation should be delayed
          if (!this.initSnapshot) {
            this.initSnapshot = s;
            resolve(true);
            return this.resultOfPreactivationDone;

            // subsequent navigations should not be delayed
          } else {
            return of (s);
          }
        };
        router.initialNavigation();
      }

      return res;
    });
  }

  bootstrapListener(bootstrappedComponentRef: ComponentRef<any>): void {
    const ref = this.injector.get(ApplicationRef);
    if (bootstrappedComponentRef !== ref.components[0]) {
      return;
    }

    const preloader = this.injector.get(RouterPreloader);
    preloader.setUpPreloading();

    const router = this.injector.get(Router);
    router.resetRootComponentType(ref.componentTypes[0]);

    this.resultOfPreactivationDone.next(this.initSnapshot);
    this.resultOfPreactivationDone.complete();
  }
}

export function getAppInitializer(r: RouterInitializer) {
  return r.appInitializer.bind(r);
}

export function getBootstrapListener(r: RouterInitializer) {
  return r.bootstrapListener.bind(r);
}

export const ROUTER_INITIALIZER = new OpaqueToken('Router Initializer');

export function provideRouterInitializer() {
  return [
    RouterInitializer,
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: getAppInitializer,
      deps: [RouterInitializer]
    },
    {
      provide: ROUTER_INITIALIZER,
      useFactory: getBootstrapListener,
      deps: [RouterInitializer]
    },
    {
      provide: APP_BOOTSTRAP_LISTENER,
      multi: true,
      useExisting: ROUTER_INITIALIZER
    }
  ];
}
