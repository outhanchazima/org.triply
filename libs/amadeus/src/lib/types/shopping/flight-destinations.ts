import { Defaults, Issue, Meta } from '../shared';

type Price = {
  total?: string;
};

type LocationValue = {
  subType?: 'AIRPORT' | 'CITY';
  detailedName?: string;
};

type LocationDictionary = Record<string, LocationValue>;
type CurrencyDictionary = Record<string, string>;

type FlightDestination = {
  type?: string;
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  price?: Price;
  links?: {
    flightDates?: string;
    flightOffers?: string;
  };
};

type Dictionaries = {
  currencies?: CurrencyDictionary;
  locations?: LocationDictionary;
};
export type FlightDestinationsParams = {
  origin: string;
} & Defaults;

export type FlightDestinationsResult = {
  data: FlightDestination[];
  dictionaries?: Dictionaries;
  meta?: Meta;
  warnings?: Issue[];
};
