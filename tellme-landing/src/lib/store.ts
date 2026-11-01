'use client';
import { create } from 'zustand';
type DemoState = { moment: number; choose: (moment: number) => void };
export const useDayDemo = create<DemoState>((set) => ({ moment: 0, choose: (moment) => set({ moment }) }));
