import AmadeusClient, {
  AmadeusResponse,
} from '../services/amadeus-client.service';
import {
  PageName,
  RequestInfo,
  ReturnedResponseSuccess,
} from '../types/pagination';

/**
 * A helper library for handling pagination.
 *
 * Access via the {@link AmadeusClient} object
 *
 * ```ts
 * const amadeus = new AmadeusClient();
 * amadeus.pagination.page('next', response);
 * ```
 */
export default class Pagination {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Fetch the page for the given page name, and make the next API call based on
   * the previous request made.
   *
   * @param pageName - The name of the page to fetch, should be available
   *    as a link in the meta links in the response
   * @param response - The response containing the links to the next pages,
   *   and the request used to make the previous call
   * @returns Promise resolving to the next page data
   * @throws {Error} When the request fails
   * @example
   * ```ts
   * const amadeus = new AmadeusClient();
   * const nextPage = await amadeus.pagination.page('next', previousResponse);
   * console.log(nextPage.data);
   * ```
   */
  public async page<T = any>(
    pageName: PageName,
    response: ReturnedResponseSuccess<T>
  ): Promise<AmadeusResponse<T> | null> {
    const pageNumber = this.pageNumber(response, pageName);

    if (pageNumber) return this.call(response.request, pageNumber);

    return null;
  }

  /**
   * Makes a new call for the new page number
   *
   * @param request - The request used to make the previous call
   * @param pageNumber - The page number to fetch
   * @returns Promise resolving to the page data
   * @throws {Error} When the HTTP method is not supported
   * @private
   */
  private async call<T = any>(
    request: RequestInfo,
    pageNumber: string
  ): Promise<AmadeusResponse<T>> {
    const params = request.params || {};
    params['page'] = params['page'] || {};
    params['page']['offset'] = pageNumber;

    // Use the appropriate client method based on the verb
    if (request.verb.toLowerCase() === 'get') {
      return this.client.get<T>(request.path, params);
    } else if (request.verb.toLowerCase() === 'post') {
      return this.client.post<T>(request.path, params);
    } else if (request.verb.toLowerCase() === 'delete') {
      return this.client.delete<T>(request.path, params);
    }

    throw new Error(`Unsupported HTTP verb: ${request.verb}`);
  }

  /**
   * Tries to determine the page number from the page name. If not present, it
   * just returns null
   *
   * @param response - The response containing the links to the next pages
   * @param pageName - The name of the page to fetch
   * @returns The page number or null if not found
   * @private
   */
  private pageNumber<T = any>(
    response: ReturnedResponseSuccess<T>,
    pageName: PageName
  ): string | null {
    try {
      const links = response.result.meta?.links;
      if (!links || !links[pageName]) {
        return null;
      }

      const pageUrl = links[pageName];
      const number = pageUrl.split('page%5Boffset%5D=')[1]?.split('&')[0];

      return number || null;
    } catch (error) {
      return null;
    }
  }
}
