import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatISO } from 'date-fns';
import { firstValueFrom } from 'rxjs';
import Airline from '../client/airline';
import Airport from '../client/airport';
import Analytics from '../client/analytics';
import Booking from '../client/booking';
import EReputation from '../client/e-reputation';
import Location from '../client/location';
import Media from '../client/media';
import Ordering from '../client/ordering';
import Pagination from '../client/pagination';
import ReferenceData from '../client/reference-data';
import Schedule from '../client/schedule';
import Shopping from '../client/shopping';
import Travel from '../client/travel';

// Simplified type definitions
export type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'PUT';

export interface AmadeusResponse<T> {
  data: T;
  statusCode: number;
}

/**
 * Simplified Amadeus API client using NestJS patterns.
 * Handles authentication and HTTP requests to Amadeus APIs.
 */
@Injectable()
export default class AmadeusClient {
  private readonly logger = new Logger(AmadeusClient.name);
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  // Namespaced clients
  public referenceData: ReferenceData;
  public shopping: Shopping;
  public booking: Booking;
  public travel: Travel;
  public eReputation: EReputation;
  public media: Media;
  public ordering: Ordering;
  public airport: Airport;
  public pagination: Pagination;
  public schedule: Schedule;
  public analytics: Analytics;
  public location: Location;
  public airline: Airline;

  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.baseUrl = this.configService.get<string>('AMADEUS_API_URL');
    this.clientId = this.configService.get<string>('AMADEUS_API_KEY');
    this.clientSecret = this.configService.get<string>('AMADEUS_API_SECRET');

    if (!this.clientId || !this.clientSecret || !this.baseUrl) {
      throw new Error('Amadeus client ID, secret, and base URL are required');
    }

    this.referenceData = new ReferenceData(this);
    this.shopping = new Shopping(this);
    this.booking = new Booking(this);
    this.travel = new Travel(this);
    this.eReputation = new EReputation(this);
    this.media = new Media(this);
    this.ordering = new Ordering(this);
    this.airport = new Airport(this);
    this.pagination = new Pagination(this);
    this.schedule = new Schedule(this);
    this.analytics = new Analytics(this);
    this.location = new Location(this);
    this.airline = new Airline(this);
  }

  /**
   * Get access token for Amadeus API
   */
  private async getAccessToken(): Promise<string> {
    this.logger.debug('Initializing Amadeus access token retrieval');

    if (this.accessToken && Date.now() < this.tokenExpiry) {
      this.logger.debug('Using cached Amadeus access token');
      return this.accessToken;
    }

    try {
      this.logger.debug('Fetching new Amadeus access token');
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v1/security/oauth2/token`,
          new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.clientId,
            client_secret: this.clientSecret,
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        )
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;

      this.logger.debug('Amadeus access token retrieved successfully');
      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to get Amadeus access token', error);
      throw error;
    }
  }

  /**
   * Make authenticated GET request
   */
  public async get<T>(
    path: string,
    params: object = {}
  ): Promise<AmadeusResponse<T>> {
    return this.request<T>('GET', path, params);
  }

  /**
   * Make authenticated POST request
   */
  public async post<T>(
    path: string,
    data: object = {}
  ): Promise<AmadeusResponse<T>> {
    return this.request<T>('POST', path, data);
  }

  /**
   * Make authenticated DELETE request
   */
  public async delete<T>(
    path: string,
    params: object = {}
  ): Promise<AmadeusResponse<T>> {
    return this.request<T>('DELETE', path, params);
  }

  /**
   * Make authenticated HTTP request
   */
  private async request<T>(
    method: HttpMethod,
    path: string,
    data: object = {}
  ): Promise<AmadeusResponse<T>> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${path}`;

    const headers = this.getHeaders(token);

    try {
      let response: any;

      switch (method) {
        case 'GET':
          response = await firstValueFrom(
            this.httpService.get<T>(url, { params: data, headers })
          );
          break;
        case 'POST':
          response = await firstValueFrom(
            this.httpService.post<T>(url, data, { headers })
          );
          break;
        case 'DELETE':
          response = await firstValueFrom(
            this.httpService.delete<T>(url, { params: data, headers })
          );
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      return {
        data: response.data,
        statusCode: response.status,
      };
    } catch (error) {
      this.logger.error(
        `Amadeus API ${method} - ${path} - ${data} Failed`,
        error
      );
      throw error;
    }
  }

  private getHeaders(accessToken: string): Record<string, string> {
    this.logger.debug('Generating headers for Amadeus API request');

    const AMADEUS_CLIENT_REF = `${this.configService.get<string>(
      'AMADEUS_APP_NAME'
    )}-PDT-${formatISO(new Date())}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Ama-Client-Ref': AMADEUS_CLIENT_REF,
    };

    return headers;
  }
}
