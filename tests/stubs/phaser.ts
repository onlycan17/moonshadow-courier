export const AUTO = 0;
export const Scale = {
  FIT: 'FIT',
  CENTER_BOTH: 'CENTER_BOTH'
};

class Scene {
  public scene = {
    start: (_key: string) => undefined
  };

  public cameras = {
    main: {
      setBackgroundColor: (_color: number | string) => undefined
    }
  };

  public scale = {
    width: 1280,
    height: 720
  };

  public add = {
    rectangle: () => ({
      setStrokeStyle: (_width: number, _color: number) => undefined
    }),
    text: () => ({
      setOrigin: (_x: number, _y?: number) => undefined,
      setText: (_value: string) => undefined
    })
  };

  public input = {
    keyboard: {
      enabled: true,
      addKey: (_code: number) => ({ isDown: false })
    }
  };

  public game = {
    canvas: null
  };

  public events = {
    once: (_event: string, _callback: () => void) => undefined,
    on: (_event: string, _callback: () => void) => undefined
  };

  public constructor(_key?: string) {}
}

const Phaser = {
  AUTO,
  Scale,
  Scene,
  Scenes: {
    Events: {
      SHUTDOWN: 'shutdown',
      UPDATE: 'update'
    }
  },
  Input: {
    Keyboard: {
      KeyCodes: {
        LEFT: 37,
        RIGHT: 39,
        UP: 38,
        DOWN: 40
      }
    }
  }
};

export default Phaser;
