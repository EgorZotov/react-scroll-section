import {
  ReactNode,
  createRef,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { throttle, isWindowDefine, throttleEvent } from './utils';
import { Provider, Section } from './context';
import smoothscroll from 'smoothscroll-polyfill';

type Props = {
  throttleDelay?: number;
  scrollBehavior?: 'auto' | 'smooth';
  offset?: number;
  children: ReactNode;
};

if (isWindowDefine()) {
  smoothscroll.polyfill();
  throttleEvent('scroll', 'optimizedScroll', document);
}

export const ScrollingProvider = ({
  throttleDelay = 200,
  scrollBehavior = 'smooth',
  offset = 0,
  children,
}: Props) => {
  const [selected, setSelected] = useState('');
  const [sections, setSections] = useState<Record<string, Section>>({});

  useEffect(() => {
    document.addEventListener('optimizedScroll', throttleScroll, true);
    handleScroll();
    return () => {
      document.removeEventListener('optimizedScroll', throttleScroll, true);
    };
  }, []);

  const handleScroll = useCallback(() => {
    const selectedSection = Object.keys(sections).reduce(
      (acc, id) => {
        const sectionRef = sections[id].ref.current;
        if (!sectionRef) {
          return {
            id,
            differenceFromTop: 0,
          };
        }

        const { top } = sectionRef.getBoundingClientRect();
        const differenceFromTop = Math.abs(top);

        if (differenceFromTop >= acc.differenceFromTop) return acc;

        return {
          id,
          differenceFromTop,
        };
      },
      {
        id: '',
        differenceFromTop: 9999,
      },
    );

    if (selected !== selectedSection.id) setSelected(selectedSection.id);
  }, [sections]);

  const throttleScroll = throttle(handleScroll, throttleDelay);

  const registerRef = ({ id, meta }: { id: string; meta: unknown }) => {
    const ref = createRef<HTMLElement>();
    setSections((prev) => ({ ...prev, [id]: { ref, meta } }));
    return ref;
  };

  const unregisterRef = (id: string) => {
    setSections(({ [id]: toRemove, ...rest }) => rest);
  };

  const scrollTo = useCallback(
    (id: string) => {
      const section = sections[id];
      if (!section) return console.warn('Section ID not recognized!'); // eslint-disable-line

      setSelected(id);
      if (section.ref.current) {
        window.scrollTo({
          top: section.ref.current.offsetTop + offset,
          behavior: scrollBehavior,
        });
      }
    },
    [sections],
  );

  const value = useMemo(
    () => ({
      registerRef,
      unregisterRef,
      scrollTo,
      sections,
      selected,
    }),
    [selected, sections],
  );

  return <Provider value={value}>{children}</Provider>;
};
