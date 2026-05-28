import { describe, expect, it } from "vitest"
import {
  canCreateSideQuestForChild,
  getBlockedChildIdsForQuestDate,
  getTodayQuestDate,
} from "./sideQuestDailyLimit"

const today = "2026-05-28"
const tomorrow = "2026-05-29"
const sideQuests = [
  { child_id: "gael", quest_date: today },
]

describe("sideQuestDailyLimit", () => {
  it("formats the local quest date without converting to UTC", () => {
    expect(getTodayQuestDate(new Date(2026, 4, 28, 23, 30))).toBe(today)
  })

  it("allows creating a SideQuest for Maya when Gael already has one today", () => {
    expect(canCreateSideQuestForChild(sideQuests, "maya", today)).toBe(true)
  })

  it("blocks a second SideQuest for the same child on the same quest_date", () => {
    expect(canCreateSideQuestForChild(sideQuests, "gael", today)).toBe(false)
    expect(getBlockedChildIdsForQuestDate(sideQuests, today)).toEqual(new Set(["gael"]))
  })

  it("allows a new SideQuest for the same child on another quest_date", () => {
    expect(canCreateSideQuestForChild(sideQuests, "gael", tomorrow)).toBe(true)
    expect(getBlockedChildIdsForQuestDate(sideQuests, tomorrow)).toEqual(new Set())
  })
})
