import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import { ActivityResult } from '../../types/shopping/activity';

/**
 * A namespaced client for the `/v1/shopping/activities/{activityId}` endpoints
 */
export default class Activity {
  private activityId: string;

  constructor(private readonly client: AmadeusClient, activityId: string) {
    this.activityId = activityId;
  }

  /**
   * Retrieve information of an activity by its Id.
   * @returns {Promise<AmadeusResponse<ActivityResult>>}
   * @throws {Error} If the request fails.
   * @example
   * const response = await amadeus.shopping.activity('3216547684').get();
   */
  public async get(): Promise<AmadeusResponse<ActivityResult>> {
    return this.client.get<ActivityResult>(
      `/v1/shopping/activities/${this.activityId}`
    );
  }
}
