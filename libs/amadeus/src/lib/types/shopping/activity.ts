import { CollectionMetaLink, Issue } from '../shared';
import { Activity } from './activities';

export type ActivityResult = {
  meta?: CollectionMetaLink;
  data: Activity;
  warnings?: Issue[];
};
