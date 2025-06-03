export class TeamDraw {
  name: string;
  country: string;
  bombo: number;
  isCurrentChampion: boolean;
  isFromQualifyingStage: boolean;
  logo: string;
  originalId: string;
  ranking?: number;

  constructor(
    name: string,
    country: string,
    bombo: number,
    isCurrentChampion: boolean = false,
    isFromQualifyingStage: boolean = false,
    logo: string,
    originalId: string,
    ranking?: number,
  ) {
    this.name = name;
    this.country = country;
    this.bombo = bombo;
    this.isCurrentChampion = isCurrentChampion;
    this.isFromQualifyingStage = isFromQualifyingStage;
    this.logo = logo;
    this.originalId = originalId;
    this.ranking = ranking;
  }

  toString(): string {
    return `${this.name} (${this.country})`;
  }
}
