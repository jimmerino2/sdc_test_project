import { buildSchema } from "graphql";

// Dates are plain "YYYY-MM-DD" strings.
export default buildSchema(`
  enum HarvestStatus { AVAILABLE DONATED }

  type Category { id: ID!  name: String! }
  type FoodBank { id: ID!  name: String!  address: String! }

  type Harvest {
    id: ID!
    crop: String!
    category: Category!
    quantityKg: Float!
    availableUntil: String!
    status: HarvestStatus!
    "Set once donated"
    foodBank: FoodBank
    donatedAt: String
    "True when the signed-in user listed it"
    mine: Boolean!
  }

  type Summary { availableKg: Float!  donatedKg: Float! }
  type AuthPayload { token: String! }

  type CategoryTotal { category: String!  kg: Float! }
  type DonationLine { crop: String!  category: String!  quantityKg: Float!  donatedAt: String! }
  type FoodBankReport {
    foodBank: FoodBank!
    totalKg: Float!
    harvestCount: Int!
    byCategory: [CategoryTotal!]!
    donations: [DonationLine!]!
  }
  type WeeklyReport {
    "Monday of the reported week"
    weekStart: String!
    "Sunday of the reported week"
    weekEnd: String!
    totalKg: Float!
    harvestCount: Int!
    foodBanks: [FoodBankReport!]!
  }

  input HarvestInput { crop: String!  categoryId: ID!  quantityKg: Float!  availableUntil: String! }

  type Query {
    categories: [Category!]!
    foodBanks: [FoodBank!]!
    "Public listing. AVAILABLE hides expired produce; DONATED shows recent donations first."
    harvests(categoryId: ID, status: HarvestStatus = AVAILABLE): [Harvest!]!
    summary: Summary!
    "Donations per partner food bank for the Monday-Sunday week containing weekStart (default: this week)"
    weeklyDonationReport(weekStart: String, foodBankId: ID): WeeklyReport!
    "Requires login. All of the user's harvests unless filtered."
    myHarvests(categoryId: ID, status: HarvestStatus): [Harvest!]!
  }

  type Mutation {
    register(email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    addHarvest(input: HarvestInput!): Harvest!
    donateHarvest(id: ID!, foodBankId: ID!): Harvest!
    removeHarvest(id: ID!): Boolean!
  }
`);
