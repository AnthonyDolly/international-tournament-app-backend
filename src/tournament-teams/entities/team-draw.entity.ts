export class TeamDraw {
  name: string;
  country: string;
  bombo: number;
  isCurrentChampion: boolean;
  isFromQualifiers: boolean;
  logo: string;
  originalId: string;

  constructor(
    name: string,
    country: string,
    bombo: number,
    isCurrentChampion: boolean = false,
    isFromQualifiers: boolean = false,
    logo: string,
    originalId: string,
  ) {
    this.name = name;
    this.country = country;
    this.bombo = bombo;
    this.isCurrentChampion = isCurrentChampion;
    this.isFromQualifiers = isFromQualifiers;
    this.logo = logo;
    this.originalId = originalId;
  }

  toString(): string {
    return `${this.name} (${this.country})`;
  }
}
