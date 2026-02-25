import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class SearchFlightsDto {
  @ApiProperty({ example: 'JFK', description: 'IATA origin airport code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{3}$/, {
    message: 'origin must be a valid 3-letter IATA code',
  })
  origin!: string;

  @ApiProperty({ example: 'LAX', description: 'IATA destination airport code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{3}$/, {
    message: 'destination must be a valid 3-letter IATA code',
  })
  destination!: string;

  @ApiProperty({
    example: '2026-06-15',
    description: 'Departure date (YYYY-MM-DD)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date!: string;

  @ApiPropertyOptional({
    example: '1',
    description: 'Number of adult passengers',
    default: '1',
  })
  @IsOptional()
  @IsNumberString()
  adults = '1';
}
