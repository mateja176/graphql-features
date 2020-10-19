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

export type Filter = BooleanFilter | NumberFilter | StringFilter;

export type Filters<Index extends string> = {
  [key in Index]?: Filter;
};

export type AndFilter<Index extends string> = {
  and: Array<Filters<Index> | OrFilter<Index>>;
};

export type OrFilter<Index extends string> = {
  or: Array<Filters<Index> | AndFilter<Index>>;
};

export type CompositeFilter<Index extends string> =
  | AndFilter<Index>
  | OrFilter<Index>;

interface Test {
  id: string;
  available: boolean;
  promo: boolean;
  price: number;
}

export const example: CompositeFilter<keyof Test> = {
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
