declare module Support {
  export interface AgendaPunt {
    uri: string;
    geplandOpenbaar: boolean;
    titel: string;
    position: number;
  }

  export interface Zitting {
    geplandeStart: any;
    bestuursorgaan: any;
    agendapunten: AgendaPunt[];
    uri: string;
  }

  interface QueryHead<T extends string> {
    link: Array<unknown>;
    vars: T;
  }

  interface BoundValue {
    type: string;
    value: string;
    datatype?: string;
  }

  type Binding<T extends string> = Record<T, BoundValue>;

  export interface QueryResult<T extends string> {
    head: QueryHead<T>;
    results: {
      bindings: Binding<T>[];
      distinct: boolean;
      ordered: boolean;
    };
  }
}
