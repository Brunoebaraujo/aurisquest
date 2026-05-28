import { describe, expect, it } from "vitest"
import {
  canCreateSideQuestForChild,
  childDashboardMatchesBlockedSideQuest,
  getBlockedChildIdsForQuestDate,
  getTodayQuestDate,
} from "./sideQuestDailyLimit"

const today = "2026-05-28"
const tomorrow = "2026-05-29"
const familyId = "auris-family"
const sideQuests = [
  { family_id: familyId, child_id: "gael", quest_date: today },
]

describe("sideQuestDailyLimit", () => {
  it("formats the local quest date without converting to UTC", () => {
    expect(getTodayQuestDate(new Date(2026, 4, 28, 23, 30))).toBe(today)
  })

  it("allows creating a SideQuest for Maya when Gael already has one today", () => {
    expect(canCreateSideQuestForChild(sideQuests, "maya", today, familyId)).toBe(true)
  })

  it("allows creating a SideQuest for Gael when Maya already has one today", () => {
    expect(canCreateSideQuestForChild([{ family_id: familyId, child_id: "maya", quest_date: today }], "gael", today, familyId)).toBe(true)
  })

  it("blocks a second SideQuest for the same child on the same quest_date", () => {
    expect(canCreateSideQuestForChild(sideQuests, "gael", today, familyId)).toBe(false)
    expect(getBlockedChildIdsForQuestDate(sideQuests, today)).toEqual(new Set(["gael"]))
  })

  it("allows a new SideQuest for the same child on another quest_date", () => {
    expect(canCreateSideQuestForChild(sideQuests, "gael", tomorrow, familyId)).toBe(true)
    expect(getBlockedChildIdsForQuestDate(sideQuests, tomorrow)).toEqual(new Set())
  })

  it("matches the dashboard SideQuest to the same record used by the creation blocker", () => {
    const blocked = { family_id: familyId, child_id: "gael", quest_date: today }

    expect(childDashboardMatchesBlockedSideQuest(blocked, { family_id: familyId, child_id: "gael", quest_date: today })).toBe(true)
    expect(childDashboardMatchesBlockedSideQuest(blocked, { family_id: familyId, child_id: "gael", quest_date: tomorrow })).toBe(false)
    expect(childDashboardMatchesBlockedSideQuest(blocked, { family_id: familyId, child_id: "maya", quest_date: today })).toBe(false)
  })
})
