import { useLocalStorage } from '../useLocalStorage'
import s from './Stats.module.css'

const BIBLE_BOOKS = {
  '구약': [
    { name: '창세기', chapters: 50 }, { name: '출애굽기', chapters: 40 }, { name: '레위기', chapters: 27 },
    { name: '민수기', chapters: 36 }, { name: '신명기', chapters: 34 }, { name: '여호수아', chapters: 24 },
    { name: '사사기', chapters: 21 }, { name: '룻기', chapters: 4 }, { name: '사무엘상', chapters: 31 },
    { name: '사무엘하', chapters: 24 }, { name: '열왕기상', chapters: 22 }, { name: '열왕기하', chapters: 25 },
    { name: '역대상', chapters: 29 }, { name: '역대하', chapters: 36 }, { name: '에스라', chapters: 10 },
    { name: '느헤미야', chapters: 13 }, { name: '에스더', chapters: 10 }, { name: '욥기', chapters: 42 },
    { name: '시편', chapters: 150 }, { name: '잠언', chapters: 31 }, { name: '전도서', chapters: 12 },
    { name: '아가', chapters: 8 }, { name: '이사야', chapters: 66 }, { name: '예레미야', chapters: 52 },
    { name: '예레미야애가', chapters: 5 }, { name: '에스겔', chapters: 48 }, { name: '다니엘', chapters: 12 },
    { name: '호세아', chapters: 14 }, { name: '요엘', chapters: 3 }, { name: '아모스', chapters: 9 },
    { name: '오바댜', chapters: 1 }, { name: '요나', chapters: 4 }, { name: '미가', chapters: 7 },
    { name: '나훔', chapters: 3 }, { name: '하박국', chapters: 3 }, { name: '스바냐', chapters: 3 },
    { name: '학개', chapters: 2 }, { name: '스가랴', chapters: 14 }, { name: '말라기', chapters: 4 },
  ],
  '신약': [
    { name: '마태복음', chapters: 28 }, { name: '마가복음', chapters: 16 }, { name: '누가복음', chapters: 24 },
    { name: '요한복음', chapters: 21 }, { name: '사도행전', chapters: 28 }, { name: '로마서', chapters: 16 },
    { name: '고린도전서', chapters: 16 }, { name: '고린도후서', chapters: 13 }, { name: '갈라디아서', chapters: 6 },
    { name: '에베소서', chapters: 6 }, { name: '빌립보서', chapters: 4 }, { name: '골로새서', chapters: 4 },
    { name: '데살로니가전서', chapters: 5 }, { name: '데살로니가후서', chapters: 3 }, { name: '디모데전서', chapters: 6 },
    { name: '디모데후서', chapters: 4 }, { name: '디도서', chapters: 3 }, { name: '빌레몬서', chapters: 1 },
    { name: '히브리서', chapters: 13 }, { name: '야고보서', chapters: 5 }, { name: '베드로전서', chapters: 5 },
    { name: '베드로후서', chapters: 3 }, { name: '요한일서', chapters: 5 }, { name: '요한이서', chapters: 1 },
    { name: '요한삼서', chapters: 1 }, { name: '유다서', chapters: 1 }, { name: '요한계시록', chapters: 22 },
  ]
}

const CATS = ['가족', '직장', '교회', '전도', '감사', '치유', '기타']
const TOTAL_CHAPTERS = Object.values(BIBLE_BOOKS).flat().reduce((a, b) => a + b.chapters, 0)
const OT_TOTAL = BIBLE_BOOKS['구약'].reduce((a, b) => a + b.chapters, 0)
const NT_TOTAL = BIBLE_BOOKS['신약'].reduce((a, b) => a + b.chapters, 0)

export default function Stats() {
  const [prayers] = useLocalStorage('pb_prayers', [])
  const [journals] = useLocalStorage('pb_journals', [])
  const [readChapters] = useLocalStorage('pb_read_chapters', {})
  const [timerSec] = useLocalStorage('pb_timer_total', 0)

  // 기도 통계
  const totalPrayers = prayers.length
  const donePrayers = prayers.filter(p => p.done).length
  const prayPct = totalPrayers ? Math.round((donePrayers / totalPrayers) * 100) : 0
  const prayTimeMins = Math.floor(timerSec / 60)

  const catCounts = CATS.map(cat => ({
    cat,
    total: prayers.filter(p => p.cat === cat).length,
    done: prayers.filter(p => p.cat === cat && p.done).length,
  })).filter(c => c.total > 0)

  // 성경 통독 통계
  const totalRead = Object.values(readChapters).reduce((a, b) => a + b.length, 0)
  const biblePct = Math.round((totalRead / TOTAL_CHAPTERS) * 100)
  const otRead = BIBLE_BOOKS['구약'].reduce((a, b) => a + (readChapters[b.name] || []).length, 0)
  const ntRead = BIBLE_BOOKS['신약'].reduce((a, b) => a + (readChapters[b.name] || []).length, 0)
  const otPct = Math.round((otRead / OT_TOTAL) * 100)
  const ntPct = Math.round((ntRead / NT_TOTAL) * 100)

  const completedBooks = Object.values(BIBLE_BOOKS).flat().filter(b => (readChapters[b.name] || []).length >= b.chapters)

  // 묵상 통계
  const journalCount = journals.length

  return (
    <div className={s.wrap}>

      {/* 기도 통계 */}
      <div className={s.cardTitle}>🙏 기도 통계</div>
      <div className={s.card}>
        <div className={s.statRow3}>
          <div className={s.statBox}>
            <div className={s.statNum}>{totalPrayers}</div>
            <div className={s.statLbl}>전체 제목</div>
          </div>
          <div className={s.statBox}>
            <div className={s.statNum} style={{color:'var(--gold)'}}>{donePrayers}</div>
            <div className={s.statLbl}>완료</div>
          </div>
          <div className={s.statBox}>
            <div className={s.statNum}>{prayTimeMins}분</div>
            <div className={s.statLbl}>기도 시간</div>
          </div>
        </div>

        <div className={s.bigProgRow}>
          <div className={s.bigProgLabel}>
            <span>오늘 완료율</span>
            <span className={s.bigProgPct}>{prayPct}%</span>
          </div>
          <div className={s.bigProgBg}>
            <div className={s.bigProgFill} style={{width:`${prayPct}%`}} />
          </div>
        </div>

        {catCounts.length > 0 && (
          <div className={s.catStats}>
            <div className={s.catStatsLabel}>카테고리별</div>
            {catCounts.map(({ cat, total, done }) => (
              <div key={cat} className={s.catStatRow}>
                <span className={s.catStatName}>{cat}</span>
                <div className={s.catStatBar}>
                  <div className={s.catStatFill} style={{width: total ? `${(done/total)*100}%` : '0%'}} />
                </div>
                <span className={s.catStatCount}>{done}/{total}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 성경 통독 통계 */}
      <div className={s.cardTitle} style={{marginTop:16}}>📖 통독 통계</div>
      <div className={s.card}>
        <div className={s.statRow3}>
          <div className={s.statBox}>
            <div className={s.statNum} style={{color:'var(--gold)'}}>{totalRead}</div>
            <div className={s.statLbl}>읽은 장</div>
          </div>
          <div className={s.statBox}>
            <div className={s.statNum}>{TOTAL_CHAPTERS - totalRead}</div>
            <div className={s.statLbl}>남은 장</div>
          </div>
          <div className={s.statBox}>
            <div className={s.statNum}>{completedBooks.length}</div>
            <div className={s.statLbl}>완독 권</div>
          </div>
        </div>

        <div className={s.bigProgRow}>
          <div className={s.bigProgLabel}>
            <span>전체 진행률</span>
            <span className={s.bigProgPct}>{biblePct}%</span>
          </div>
          <div className={s.bigProgBg}>
            <div className={s.bigProgFill} style={{width:`${biblePct}%`}} />
          </div>
        </div>

        <div className={s.catStats}>
          <div className={s.catStatsLabel}>구약 / 신약</div>
          <div className={s.catStatRow}>
            <span className={s.catStatName}>구약</span>
            <div className={s.catStatBar}>
              <div className={s.catStatFill} style={{width:`${otPct}%`}} />
            </div>
            <span className={s.catStatCount}>{otRead}/{OT_TOTAL}</span>
          </div>
          <div className={s.catStatRow}>
            <span className={s.catStatName}>신약</span>
            <div className={s.catStatBar}>
              <div className={s.catStatFill} style={{width:`${ntPct}%`}} />
            </div>
            <span className={s.catStatCount}>{ntRead}/{NT_TOTAL}</span>
          </div>
        </div>

        {completedBooks.length > 0 && (
          <div className={s.completedBooks}>
            <div className={s.catStatsLabel}>완독한 책</div>
            <div className={s.bookChips}>
              {completedBooks.map(b => (
                <span key={b.name} className={s.bookChip}>{b.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 묵상 통계 */}
      <div className={s.cardTitle} style={{marginTop:16}}>✍ 묵상 통계</div>
      <div className={s.card}>
        <div className={s.statRow3}>
          <div className={s.statBox}>
            <div className={s.statNum} style={{color:'var(--gold)'}}>{journalCount}</div>
            <div className={s.statLbl}>묵상 기록</div>
          </div>
          <div className={s.statBox}>
            <div className={s.statNum}>{Math.ceil(journalCount / 4)}</div>
            <div className={s.statLbl}>꾸준한 주</div>
          </div>
          <div className={s.statBox}>
            <div className={s.statNum}>{journalCount > 0 ? '🔥' : '—'}</div>
            <div className={s.statLbl}>기록 중</div>
          </div>
        </div>
      </div>

    </div>
  )
}
