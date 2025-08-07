import AmadeusClient from '../../services/amadeus-client.service';
import Files from './files';

/**
 * A namespaced client for the
 * `/v2/media` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.media;
 * ```
 *
 * @param {AmadeusClient} client
 * @property {Files} files
 */
export default class Media {
  public files: Files;

  constructor(private readonly client: AmadeusClient) {
    this.files = new Files(this.client);
  }
}
