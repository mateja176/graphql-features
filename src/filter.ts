export type BooleanFilter = {
  equality:
    | {
        eq: boolean;
      }
    | {
        ne: boolean;
      };
};

export type Equality<A> =
  | {
      eq: A;
    }
  | {
      ne: A;
    }
  | {
      le: A;
    }
  | {
      lt: A;
    }
  | {
      ge: A;
    }
  | {
      gt: A;
    }
  | {
      le: A;
      ge: A;
    }
  | {
      le: A;
      gt: A;
    }
  | {
      lt: A;
      ge: A;
    }
  | {
      lt: A;
      gt: A;
    };

export type NumberFilter = {
  equality: Equality<number>;
};

export type StringFilter = {
  equality?: Equality<string>;
  contains?: string;
  notContains?: string;
  beginsWith?: string;
};

// TODO since GraphQL doesn't support generics
// TODO Filters needs to be unfolded
export type Filters<O extends Record<string, unknown>> = {
  [key in keyof O]?: O[key] extends boolean
    ? BooleanFilter
    : O[key] extends number
    ? NumberFilter
    : O[key] extends string
    ? StringFilter
    : never;
};

export type AndFilter<O extends Record<string, unknown>> = {
  and: Array<Filters<O> | OrFilter<O>>;
};

export type OrFilter<O extends Record<string, unknown>> = {
  or: Array<Filters<O> | AndFilter<O>>;
};

export type Filter<O extends Record<string, unknown>> =
  | AndFilter<O>
  | OrFilter<O>;

type Test = {
  id: string;
  available: boolean;
  promo: boolean;
  price: number;
};

export const example: Filter<Test> = {
  and: [
    { available: { equality: { eq: true } } },
    { id: { equality: { eq: 'XXXXX' } } },
    {
      or: [
        { promo: { equality: { eq: true } } },
        { price: { equality: { gt: 40, lt: 45 } } },
      ],
    },
  ],
};
