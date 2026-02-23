import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || value.length <= 1 || value.length >= 255) {
      throw new BadRequestException('id must be between 2 and 254 characters');
    }
    return value;
  }
}
