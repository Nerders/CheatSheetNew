'use client'

import { StoreContext } from '@/lib/store'
import { ShortCut as ShortCutType } from '@/lib/types'
import { MasonryGrid } from '@egjs/react-grid'
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Category from './Category'
import { readAppShortCut, readOSShortCut } from '@/lib/utils'
import { showMainWindow } from '@/lib/utils/window'
import { listen } from '@tauri-apps/api/event'

const ShortCut = () => {
  const { os } = useContext(StoreContext)
  const osShortCutRef = useRef<ShortCutType>() // 缓存osShortCut，避免多次读取
  const cheatSheetShortCutRef = useRef<ShortCutType>() // CheatSheet软件提示
  const [activeAppName, setActiveAppName] = useState('') // 聚焦应用
  const [shortcut, setShortCut] = useState<ShortCutType>()

  // 初始化监听事件
  const initListen = async () => {
    // 监听当前应用
    await listen('active-window', (event) => {
      setActiveAppName((activeAppName) => {
        console.log('🎉🎉🎉', 'active-window', event.payload, activeAppName)
        // 对于相同的应用，直接显示
        if (event.payload === activeAppName) showMainWindow()
        return event.payload as string
      })
    })
  }

  const initShortCut = async () => {
    // 操作系统快捷键
    osShortCutRef.current = await readOSShortCut(os)
    // CheatSheet软件快捷键提示
    cheatSheetShortCutRef.current = (await readAppShortCut('CheatSheet')) as ShortCutType
  }

  // 根据appName更新快捷键信息
  const getAppShortCut = async (name: string) => {
    const file = await readAppShortCut(name)

    // 避免重复读取CheatSheet快捷键
    if (file?.name && file?.name !== 'CheatSheet') setShortCut(file)
    else setShortCut(osShortCutRef.current)
  }

  useEffect(() => {
    // FIX: 初始化时执行一次
    if (activeAppName) getAppShortCut(activeAppName)
  }, [activeAppName])

  // 对于不同的应用，界面更新完成后，再显示窗口
  useLayoutEffect(() => {
    // FIX: 初始化时执行一次
    if (shortcut?.name) setTimeout(showMainWindow, 50)
  }, [shortcut])

  useEffect(() => {
    initShortCut()
  }, [os])

  useEffect(() => {
    initListen()
  }, [])

  return (
    <div className='w-full h-full box-border p-6 select-none'>
      {/* 瀑布流布局 */}
      <MasonryGrid>
        {shortcut?.categories.map((category) => (
          <Category key={category.name} category={category} />
        ))}
        {/* CheatSheet辅助信息已禁用 */}
		{/* {cheatSheetShortCutRef.current && <Category category={cheatSheetShortCutRef.current?.categories[0]} />} */}
      </MasonryGrid>
    </div>
  )
}

export default ShortCut