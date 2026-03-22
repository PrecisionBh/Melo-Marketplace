export type SportKey =
  | "billiards"
  | "golf"
  | "baseball_softball"
  | "cornhole"
  | "darts"
  | "disc_golf"
  | "bowling"
  | "basketball"
  | "football"
  | "soccer"
  | "fitness"

export type CategoryFilter = {
  key: string
  label: string
}

export const SPORT_CATEGORY_MAP: Record<SportKey, CategoryFilter[]> = {

  billiards: [
    { key: "all", label: "All" },
    { key: "playing_cue", label: "Playing Cue" },
    { key: "custom_cue", label: "Custom Cue" },
    { key: "break_cue", label: "Break Cue" },
    { key: "jump_cue", label: "Jump Cue" },
    { key: "case", label: "Case" },
    { key: "shaft", label: "Shaft" },
    { key: "apparel", label: "Apparel" },
    { key: "accessories", label: "Accessories" },
    { key: "collectibles", label: "Collectibles" },
    { key: "other", label: "Other" },
  ],

  golf: [
    { key: "all", label: "All" },
    { key: "drivers", label: "Drivers" },
    { key: "irons", label: "Irons" },
    { key: "putters", label: "Putters" },
    { key: "golf_bags", label: "Bags" },
    { key: "golf_balls", label: "Balls" },
    { key: "golf_accessories", label: "Accessories" },
  ],

  baseball_softball: [
    { key: "all", label: "All" },
    { key: "bats", label: "Bats" },
    { key: "gloves", label: "Gloves" },
    { key: "cleats", label: "Cleats" },
    { key: "helmets", label: "Helmets" },
    { key: "accessories", label: "Accessories" },
  ],

  basketball: [
    { key: "all", label: "All" },
    { key: "basketballs", label: "Basketballs" },
    { key: "basketball_shoes", label: "Shoes" },
    { key: "jerseys", label: "Jerseys" },
    { key: "training_equipment", label: "Training Gear" },
    { key: "hoops", label: "Hoops" },
    { key: "accessories", label: "Accessories" },
  ],

  football: [
    { key: "all", label: "All" },
    { key: "footballs", label: "Footballs" },
    { key: "helmets", label: "Helmets" },
    { key: "pads", label: "Pads" },
    { key: "cleats", label: "Cleats" },
    { key: "gloves", label: "Gloves" },
    { key: "jerseys", label: "Jerseys" },
    { key: "accessories", label: "Accessories" },
  ],

  soccer: [
    { key: "all", label: "All" },
    { key: "soccer_balls", label: "Balls" },
    { key: "cleats", label: "Cleats" },
    { key: "jerseys", label: "Jerseys" },
    { key: "shin_guards", label: "Shin Guards" },
    { key: "goalkeeper_gloves", label: "Goalie Gloves" },
    { key: "accessories", label: "Accessories" },
  ],

  fitness: [
    { key: "all", label: "All" },
    { key: "weights", label: "Weights" },
    { key: "benches", label: "Benches" },
    { key: "machines", label: "Machines" },
    { key: "resistance_bands", label: "Bands" },
    { key: "cardio_equipment", label: "Cardio" },
    { key: "accessories", label: "Accessories" },
  ],

  cornhole: [
    { key: "all", label: "All" },
    { key: "cornhole_bags", label: "Bags" },
    { key: "cornhole_boards", label: "Boards" },
    { key: "cornhole_sets", label: "Board Sets" },
    { key: "cornhole_jerseys", label: "Jerseys" },
    { key: "cornhole_accessories", label: "Accessories" },
  ],

  darts: [
    { key: "all", label: "All" },
    { key: "steel_tip_darts", label: "Steel Tip" },
    { key: "soft_tip_darts", label: "Soft Tip" },
    { key: "dart_boards", label: "Boards" },
    { key: "dart_flights", label: "Flights" },
    { key: "dart_shafts", label: "Shafts" },
  ],

  disc_golf: [
    { key: "all", label: "All" },
    { key: "disc_drivers", label: "Drivers" },
    { key: "midrange_discs", label: "Midrange" },
    { key: "disc_putters", label: "Putters" },
    { key: "disc_bags", label: "Bags" },
    { key: "disc_accessories", label: "Accessories" },
  ],

  bowling: [
    { key: "all", label: "All" },
    { key: "bowling_balls", label: "Balls" },
    { key: "bowling_bags", label: "Bags" },
    { key: "bowling_shoes", label: "Shoes" },
    { key: "bowling_accessories", label: "Accessories" },
  ],

}