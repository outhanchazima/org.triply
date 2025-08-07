import {
  CollectionMetaLink,
  Dictionaries,
  FlightOffer,
  Issue,
  OneWayCombinations,
} from '../../shared';
import { FlightOffersSearchGetResult } from '../flight-offers-search';

export type FlightOffersPredictionParams = FlightOffersSearchGetResult;

export type FlightOffersPredictionResult = {
  warnings?: Issue[];
  meta?: CollectionMetaLink & {
    oneWayCombinations?: OneWayCombinations;
  };
  data: FlightOffer[];
  dictionaries?: Dictionaries;
};
