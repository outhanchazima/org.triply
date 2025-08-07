import {
  CollectionMetaLink,
  Dictionaries,
  FlightOrder,
  Issue,
} from '../shared';

export type FlightOrdersParams = {
  data: FlightOrder;
};

export type FlightOrdersResult = {
  meta?: CollectionMetaLink;
  warnings?: Issue[];
  data: FlightOrder;
  dictionaries?: Dictionaries;
};
