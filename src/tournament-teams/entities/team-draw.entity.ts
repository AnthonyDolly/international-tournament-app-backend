export class TeamDraw {
  name: string;
  country: string;
  bombo: number;
  isCurrentChampion: boolean;
  isFromQualifyingStage: boolean;
  logo: string;
  originalId: string;

  constructor(
    name: string,
    country: string,
    bombo: number,
    isCurrentChampion: boolean = false,
    isFromQualifyingStage: boolean = false,
    logo: string,
    originalId: string,
  ) {
    this.name = name;
    this.country = country;
    this.bombo = bombo;
    this.isCurrentChampion = isCurrentChampion;
    this.isFromQualifyingStage = isFromQualifyingStage;
    this.logo = logo;
    this.originalId = originalId;
  }

  toString(): string {
    return `${this.name} (${this.country})`;
  }
}
