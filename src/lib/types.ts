import type { RecordModel } from 'pocketbase';

export interface Guest extends RecordModel {
  display_name: string;
}
export interface Beer extends RecordModel {
  name: string;
  brewery: string;
  style: string;
  abv: number;
  description: string;
  image: string;
  sort_order: number;
  is_active: boolean;
}
export interface Rating extends RecordModel {
  guest: string;
  beer: string;
  score: number;
  notes: string;
}
export interface BeerResult extends RecordModel {
  name: string;
  brewery: string;
  style: string;
  abv: number;
  average_score: number | null;
  rating_count: number;
}
export interface PartyStats extends RecordModel {
  participants: number;
  total_ratings: number;
  beer_count: number;
}
