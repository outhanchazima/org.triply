import AmadeusClient from '../../services/amadeus-client.service';

/**
 * A namespaced client for the
 * `/v2/media/files` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.media.files;
 * ```
 *
 * @param {AmadeusClient} client
 */
export default class Files {
  constructor(private readonly client: AmadeusClient) {}
}
