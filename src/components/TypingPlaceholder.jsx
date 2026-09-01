import { useEffect, useState } from 'react'

// Types out each string in `texts` in turn, pauses, deletes, then moves to the
// next — loops forever. `mobileTexts` swaps in shorter phrasing below the
// 640px breakpoint so the pill never wraps to multiple lines on phones.
export default function TypingPlaceholder({
  texts,
  mobileTexts,
  speed = 45,
  deleteSpeed = 25,
  pause = 1800,
  startDelay = 400,
  className = '',
}) {
  const [isMobile, setIsMobile] = useState(false)
  const [index, setIndex] = useState(0)
  const [count, setCount] = useState(0)
  const [phase, setPhase] = useState('typing')

  useEffect(() => {
    if (!mobileTexts) return
    const mq = window.matchMedia('(max-width: 639px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [mobileTexts])

  const activeList = isMobile && mobileTexts ? mobileTexts : texts
  const activeText = activeList[index % activeList.length]

  useEffect(() => {
    let timer

    if (phase === 'typing') {
      if (count < activeText.length) {
        timer = setTimeout(() => setCount((c) => c + 1), count === 0 ? startDelay : speed)
      } else {
        timer = setTimeout(() => setPhase('deleting'), pause)
      }
    } else {
      if (count > 0) {
        timer = setTimeout(() => setCount((c) => c - 1), deleteSpeed)
      } else {
        timer = setTimeout(() => {
          setIndex((i) => (i + 1) % activeList.length)
          setPhase('typing')
        }, 300)
      }
    }

    return () => clearTimeout(timer)
  }, [phase, count, activeText, activeList.length, speed, deleteSpeed, pause, startDelay])

  return (
    <span className={className}>
      {activeText.slice(0, count)}
      <span className="typing-cursor" aria-hidden>|</span>
    </span>
  )
}
