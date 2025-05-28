import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { TEAM_CONSTANTS } from '../constants/team.constants';

@Injectable()
export class FileManagementService {
  /**
   * Safely deletes a file if it exists
   * @param filePath Path to the file to delete
   */
  deleteFileIfExists(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
    }
  }

  /**
   * Cleans up uploaded file in case of error
   * @param file Uploaded file to clean up
   */
  cleanupUploadedFile(file: Express.Multer.File): void {
    if (file?.path) {
      this.deleteFileIfExists(file.path);
    }
  }

  /**
   * Deletes old logo file when updating
   * @param logoFilename Name of the logo file to delete
   */
  deleteOldLogo(logoFilename: string): void {
    if (logoFilename) {
      const oldLogoPath = path.join(
        TEAM_CONSTANTS.UPLOADS_DIRECTORY,
        logoFilename,
      );
      this.deleteFileIfExists(oldLogoPath);
    }
  }

  /**
   * Generates full URL for logo
   * @param logoFilename Logo filename
   * @returns Full URL or null if no logo
   */
  generateLogoUrl(logoFilename?: string): string | null {
    return logoFilename
      ? `${TEAM_CONSTANTS.LOGO_URL_PREFIX}/${logoFilename}`
      : null;
  }

  /**
   * Validates that the file is a valid image
   * @param file Uploaded file
   */
  validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      this.cleanupUploadedFile(file);
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed',
      );
    }

    if (file.size > TEAM_CONSTANTS.MAX_LOGO_FILE_SIZE) {
      this.cleanupUploadedFile(file);
      throw new BadRequestException('File size too large. Maximum size is 1MB');
    }
  }
}
