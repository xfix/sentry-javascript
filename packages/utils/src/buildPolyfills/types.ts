// export type RequireResult = Record<string, unknown> | (((...args: unknown[]) => unknown) & Record<string, unknown>);
import { Primitive } from '@sentry/types';

export type GenericObject = { [key: string]: Value };
export type GenericFunction = (...args: unknown[]) => Value;
export type Value = Primitive | GenericFunction | GenericObject;

export type RequireResult = GenericObject | (GenericFunction & GenericObject);
// export type RequireResult = GenericObject | GenericFunction | (GenericFunction & GenericObject);
