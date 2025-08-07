import { CollectionMetaLink, GeoCode } from '../../../shared';

type Location = {
  id?: string;
  self?: Links;
  type?: string;
  subType?: 'AIRPORT' | 'CITY' | 'POINT_OF_INTEREST' | 'DISTRICT';
  name?: string;
  geoCode?: GeoCode;
  category?:
    | 'SIGHTS'
    | 'BEACH_PARK'
    | 'HISTORICAL'
    | 'NIGHTLIFE'
    | 'RESTAURANT'
    | 'SHOPPING';
  tags?: string[];
  rank?: string;
};

type Links = {
  href?: string;
  methods?: ('GET' | 'PUT' | 'DELETE' | 'POST' | 'PATCH')[];
};

export type ReferenceDataLocationsPoisParams = {
  latitude: number;
  longitude: number;
  radius?: number;
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

export type ReferenceDataLocationsPoisResult = {
  meta?: CollectionMetaLink;
  data: Location[];
};
