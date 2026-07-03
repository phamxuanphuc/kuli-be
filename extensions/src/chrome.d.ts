interface ImportMetaEnv {
  readonly VITE_KULI_BE_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace chrome {
  namespace runtime {
    type MessageSender = {
      tab?: tabs.Tab
      frameId?: number
      id?: string
      url?: string
    }

    type SendResponse = (response?: unknown) => void

    const onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: MessageSender,
          sendResponse: SendResponse,
        ) => boolean | void,
      ): void
    }
  }

  namespace tabs {
    type Tab = {
      id?: number
      title?: string
      url?: string
    }

    function query(queryInfo: { active?: boolean; currentWindow?: boolean }): Promise<Tab[]>
    function sendMessage<TResponse = unknown>(tabId: number, message: unknown): Promise<TResponse>
  }
  namespace scripting {
    type InjectionTarget = {
      tabId: number
    }

    type InjectionResult<T = unknown> = {
      result?: T
    }

    function executeScript<T = unknown>(injection: {
      target: InjectionTarget
      func: () => T
    }): Promise<Array<InjectionResult<T>>>
  }
}
