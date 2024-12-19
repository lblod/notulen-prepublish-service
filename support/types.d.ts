declare module 'mu' {
  import { Express, RequestHandler } from "express";

  type ObjectToBind = Record<string, boolean | string | null>
  export type BindingObject<Obj extends ObjectToBind = ObjectToBind> = {
    [Prop in keyof Obj]: {
      type: string,
      value: string,
    };
  };


  export type SparqlResponse<IsAsk = false, Obj extends ObjectToBind = ObjectToBind> = IsAsk extends true ?
  {
    head: {};
    boolean: boolean;
  } : {
    head: {
      vars: string[];
    };
    results: {
      bindings: BindingObject<Obj>[];
    };
  };

  export const app: Express;
  export const query: <isAsk = false, Obj extends ObjectToBind = ObjectToBind>(query: string) => Promise<SparqlResponse<isAsk, Obj>>;
  export const update: (query: string) => Promise<void>;
  export const uuid: () => string;
  export const sparqlEscape: (value: any, type: string) => string;
  export const sparqlEscapeString: (value: string) => string;
  export const sparqlEscapeUri: (value: string) => string;
  export const sparqlEscapeInt: (value: number) => string;
  export const sparqlEscapeDecimal: (value: number) => string;
  export const sparqlEscapeFloat: (value: number) => string;
  export const sparqlEscapeDateTime: (value: Date) => string;
  export const sparqlEscapeBool: (value: boolean) => string;
  export const sparqlEscapeDate: (value: Date) => string;
  export const errorHandler: RequestHandler;
  // this is a tagged template string function
  export const sparql: (
    strings: TemplateStringsArray,
    ...values: any[]
  ) => string;
  export const SPARQL: (
    strings: TemplateStringsArray,
    ...values: any[]
  ) => string;

  const mu: {
    app: typeof app;
    query: typeof query;
    update: typeof update;
    uuid: typeof uuid;
    sparqlEscape: typeof sparqlEscape;
    sparqlEscapeString: typeof sparqlEscapeString;
    sparqlEscapeUri: typeof sparqlEscapeUri;
    sparqlEscapeInt: typeof sparqlEscapeInt;
    sparqlEscapeDecimal: typeof sparqlEscapeDecimal;
    sparqlEscapeFloat: typeof sparqlEscapeFloat;
    sparqlEscapeDateTime: typeof sparqlEscapeDateTime;
    sparqlEscapeBool: typeof sparqlEscapeBool;
    sparqlEscapeDate: typeof sparqlEscapeDate;
    errorHandler: typeof errorHandler;
    sparql: typeof sparql;
    SPARQL: typeof SPARQL;
  };
  export default mu;
}
