/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ChangeDetectionStrategy, ViewEncapsulation} from '@angular/core';

import {CompileIdentifierMetadata} from '../compile_metadata';
import {createEnumExpression} from '../compiler_util/identifier_util';
import {Identifiers, resolveEnumIdentifier} from '../identifiers';
import * as o from '../output/output_ast';
import {ChangeDetectorStatus, ViewType} from '../private_import_core';

function _enumExpression(classIdentifier: CompileIdentifierMetadata, name: string): o.Expression {
  return o.importExpr(resolveEnumIdentifier(classIdentifier, name));
}

export class ViewTypeEnum {
  static fromValue(value: ViewType): o.Expression {
    return createEnumExpression(Identifiers.ViewType, value);
  }
}

export class ViewEncapsulationEnum {
  static fromValue(value: ViewEncapsulation): o.Expression {
    return createEnumExpression(Identifiers.ViewEncapsulation, value);
  }
}

export class ChangeDetectionStrategyEnum {
  static fromValue(value: ChangeDetectionStrategy): o.Expression {
    return createEnumExpression(Identifiers.ChangeDetectionStrategy, value);
  }
}

export class ChangeDetectorStatusEnum {
  static fromValue(value: ChangeDetectorStatusEnum): o.Expression {
    return createEnumExpression(Identifiers.ChangeDetectorStatus, value);
  }
}

export class ViewConstructorVars {
  static viewUtils = o.variable('viewUtils');
  static parentInjector = o.variable('parentInjector');
  static declarationEl = o.variable('declarationEl');
}

export class ViewProperties {
  static renderer = o.THIS_EXPR.prop('renderer');
  static projectableNodes = o.THIS_EXPR.prop('projectableNodes');
  static viewUtils = o.THIS_EXPR.prop('viewUtils');
}

export class InjectMethodVars {
  static token = o.variable('token');
  static requestNodeIndex = o.variable('requestNodeIndex');
  static notFoundResult = o.variable('notFoundResult');
}

export class DetectChangesVars {
  static throwOnChange = o.variable(`throwOnChange`);
  static changes = o.variable(`changes`);
  static changed = o.variable(`changed`);
}
