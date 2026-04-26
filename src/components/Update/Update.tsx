'use client'

import MarkDown from 'react-markdown'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { UpdateManifest, checkUpdate, installUpdate } from '@tauri-apps/api/updater'
import { WebviewWindow } from '@tauri-apps/api/window'
import { UnlistenFn, listen } from '@tauri-apps/api/event'
import toast from 'react-hot-toast'
import { toastIcon, toastStyle } from '@/lib/utils/toast'
import { relaunch } from '@tauri-apps/api/process'

let unlisten: UnlistenFn
let eventId = 0
let abortController: AbortController | null = null

const Update = () => {
  const window = useRef<WebviewWindow>()
  const [loading, setLoading] = useState(true)
  const [isLatest, setIsLatest] = useState(true)
  const [currentVersion, setCurrentVersion] = useState('')
  const [manifest, setManifest] = useState<UpdateManifest>()
  const [total, setTotal] = useState(0)
  const [downloaded, setDownloaded] = useState(-1)
  const [cancelled, setCancelled] = useState(false)
  const percent = (downloaded / total) * 100

  const init = async () => {
    // 获取当前窗口
    const { getCurrent } = await import('@tauri-apps/api/window')
    window.current = getCurrent()

    // 获取当前版本
    const { getVersion } = await import('@tauri-apps/api/app')
    setCurrentVersion(await getVersion())
  }

  const close = async () => {
    // 清理监听器
    if (unlisten) {
      unlisten()
    }
    // 取消正在进行的检查
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    await window.current?.close()
  }

  const update = async () => {
    installUpdate().then(() => {
      toast('下载成功', { icon: toastIcon, style: toastStyle })
      relaunch()
    })
  }

  const cancelCheck = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
      setCancelled(true)
      setLoading(false)
      toast('已取消检查更新', { icon: '⚠️', style: toastStyle })
    }
  }

  const check = async () => {
    // 创建 AbortController 用于取消请求
    abortController = new AbortController()
    
    try {
      const { shouldUpdate, manifest } = await checkUpdate({ signal: abortController.signal })
      
      // 如果被取消，不继续处理
      if (abortController.signal.aborted) {
        return
      }
      
      setIsLatest(!shouldUpdate)

      if (shouldUpdate) {
        setManifest(manifest)

        // 记录当前下载进度
        unlisten = await listen('tauri://update-download-progress', (e) => {
          if (eventId === 0) {
            eventId = e.id
          }
          if (e.id === eventId && !abortController?.signal.aborted) {
            // @ts-ignore
            setTotal(e.payload.contentLength)
            setDownloaded((a) => {
              // @ts-ignore
              return a + e.payload.chunkLength
            })
          }
        })
      }
    } catch (err: any) {
      // 如果是用户取消，不显示错误
      if (err?.name !== 'AbortError' && !abortController?.signal.aborted) {
        console.error('检查更新失败:', err)
        toast('检查更新失败，请稍后重试', { icon: '❌', style: toastStyle })
      }
    } finally {
      setLoading(false)
      abortController = null
    }
  }

  useEffect(() => {
    init()
    check()
    
    // 组件卸载时清理
    return () => {
      if (unlisten) {
        unlisten()
      }
      if (abortController) {
        abortController.abort()
        abortController = null
      }
    }
  }, [])

  return (
    <div className='relative flex w-full h-full pr-2 select-none'>
      <div className='w-1/4 mt-6'>
        <Image src='imgs/icon.png' width={72} height={72} alt='icon' className='mx-auto' />
      </div>
      {loading ? (
        // 加载中 - 显示取消按钮
        <div className='flex-1 flex flex-col justify-center items-center gap-4'>
          <span className='loading loading-spinner' />
          <p className='text-sm text-gray-500'>正在检查更新...</p>
          <button 
            type='button' 
            className='btn btn-outline btn-sm' 
            onClick={cancelCheck}
          >
            取消
          </button>
        </div>
      ) : cancelled ? (
        // 已取消
        <div className='flex-1 flex flex-col justify-center items-center gap-4'>
          <p className='text-gray-500'>已取消检查更新</p>
          <button 
            type='button' 
            className='btn btn-info btn-sm' 
            onClick={close}
          >
            关闭
          </button>
        </div>
      ) : isLatest ? (
        // 最新版本
        <div className='flex-1 flex flex-col gap-2 pt-4 pb-12 text-sm'>
          <p className='font-semibold'>当前应用已是最新版本</p>
          <p>
            CheatSheet 最新版本 <span className='font-semibold'>{currentVersion}</span>，您现在的版本是{' '}
            <span className='font-semibold'>{currentVersion}</span>。
          </p>
          {/* 操纵 */}
          <div className={`absolute right-2 bottom-10 ${total !== 0 ? 'hidden' : ''}`}>
            <button type='button' className='btn btn-info btn-sm w-24' onClick={close}>
              确认
            </button>
          </div>
        </div>
      ) : (
        // 更新窗口
        <>
          <div className='flex-1 flex flex-col gap-2 pt-4 pb-12 text-sm'>
            <p className='font-semibold'>新版本的 CheatSheet 已经发布</p>
            <p>
              CheatSheet <span className='font-semibold'>{manifest?.version}</span> 可供下载，您现在的版本是{' '}
              <span className='font-semibold'>{currentVersion}</span>。您现在要下载吗？
            </p>
            <p className='font-semibold'>更新信息: </p>
            <div className='bg-[var(--background-prose)] shadow-inner overflow-auto rounded pl-2 mr-4 mb-8 h-full'>
              <div className='prose prose-neutral dark:prose-invert scale-[.85] -translate-x-7 -translate-y-4'>
                <MarkDown>{manifest?.body}</MarkDown>
              </div>
            </div>
          </div>
          {/* 操纵 */}
          <div className={`absolute right-2 bottom-10 ${total !== 0 ? 'hidden' : ''}`}>
            <button type='button' className='btn btn-info btn-sm w-24 mr-6' onClick={update}>
              更新
            </button>
            <button type='button' className='btn btn-neutral btn-sm w-24' onClick={close}>
              取消
            </button>
          </div>
        </>
      )}
      {/* 进度条 */}
      {total !== 0 && (
        <div className='absolute bottom-11 w-full px-6 flex flex-col justify-center gap-1'>
          <div className='flex justify-between text-sm'>
            {downloaded < total ? (
              <>
                <p>下载进度</p>
                <p>{Math.floor(percent)}%</p>
              </>
            ) : (
              <p>安装中...</p>
            )}
          </div>
          <progress className='progress progress-info' value={percent} max='100' />
        </div>
      )}
    </div>
  )
}

export default Update