export type ReferenceDataLocationsPoisBySquareParams = {
  north: number;
  west: number;
  south: number;
  east: number;
  page?: {
    limit?: number;
    offset?: number;
  };
  categories?:
    | 'SIGHTS'
    | 'NIGHTLIFE'
    | 'RESTAURANT'
    | 'SHOPPING'
    | (string & object);
};

export type { ReferenceDataLocationsPoisResult as ReferenceDataLocationsPoisBySquareResult } from '.';
