import { useSyncExternalStore } from 'react'
import type { Bill, BillInput, Settings } from '../types'
import { createId } from './format'
import { loadBills, loadSettings, normalizeBill, saveBills, saveSettings } from './storage'

export interface AppState {
  bills: Bill[]
  settings: Settings
}

let state: AppState = {
  bills: loadBills(),
  settings: loadSettings()
}

const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): AppState {
  return state
}

function commit(next: AppState): void {
  state = next
  emit()
}

function setBills(bills: Bill[]): void {
  saveBills(bills)
  commit({ ...state, bills })
}

export function useStore(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export const actions = {
  addBill(input: BillInput): Bill {
    const tag = input.tag?.trim()
    const bill: Bill = {
      id: createId(),
      type: input.type,
      amount: Math.round(input.amount * 100) / 100,
      category: input.category,
      ...(tag ? { tag } : {}),
      date: input.date,
      note: input.note.trim(),
      createdAt: Date.now()
    }
    setBills([...state.bills, bill])
    return bill
  },

  updateBill(bill: Bill): void {
    setBills(
      state.bills.map((item) =>
        item.id === bill.id
          ? {
              ...item,
              ...bill,
              amount: Math.round(bill.amount * 100) / 100,
              note: bill.note.trim(),
              tag: bill.tag?.trim() || undefined
            }
          : item
      )
    )
  },

  removeBill(id: string): void {
    setBills(state.bills.filter((item) => item.id !== id))
  },

  clearBills(): void {
    setBills([])
  },

  setBudget(budget: number): void {
    const settings: Settings = {
      ...state.settings,
      budget: Number.isFinite(budget) && budget > 0 ? budget : 0
    }
    saveSettings(settings)
    commit({ ...state, settings })
  },

  setSound(sound: boolean): void {
    const settings: Settings = { ...state.settings, sound }
    saveSettings(settings)
    commit({ ...state, settings })
  },

  updateSettings(patch: Partial<Settings>): void {
    const settings: Settings = { ...state.settings, ...patch }
    saveSettings(settings)
    commit({ ...state, settings })
  },

  importBills(rawList: unknown): number {
    if (!Array.isArray(rawList)) {
      throw new Error('数据格式不正确')
    }
    const normalized = rawList.map(normalizeBill).filter((bill): bill is Bill => bill !== null)
    if (!normalized.length) {
      throw new Error('没有可导入的有效账目')
    }
    setBills(normalized)
    return normalized.length
  }
}
