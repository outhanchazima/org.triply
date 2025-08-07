export type PageName = 'next' | 'previous' | 'first' | 'last';

export interface RequestInfo {
  verb: string;
  path: string;
  params?: any;
}

export interface PaginationMeta {
  links?: Record<PageName, string>;
  count?: number;
}

export interface ReturnedResponseSuccess<T = any> {
  result: {
    meta?: PaginationMeta;
    data?: T;
  };
  request: RequestInfo;
}
