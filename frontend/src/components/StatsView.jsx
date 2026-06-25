import React, { useState, useEffect } from 'react';
import { getFlag } from './PredictForm';

export default function StatsView({ matches, room }) {
  const [subTab, setSubTab] = useState('tournament'); // tournament, teams, roomInsights
  const [tournamentStats, setTournamentStats] = useState({ goalscorers: [], cards: [] });
  const [loading, setLoading] = useState(false);

  // Cargar estadísticas del torneo (goleadores, tarjetas) del backend
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setTournamentStats(data);
        }
      } catch (e) {
        console.error('Error al cargar stats del torneo:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Calcular la tabla del Mundial dinámicamente desde la lista de partidos jugados
  const getTeamStandings = () => {
    const stats = {};
    matches.forEach(m => {
      if (m.status !== 'played') return;
      const teams = [m.homeTeam, m.awayTeam];
      teams.forEach(t => {
        if (!stats[t]) {
          stats[t] = { team: t, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
        }
      });

      const home = m.homeTeam;
      const away = m.awayTeam;
      const hScore = m.homeScore;
      const aScore = m.awayScore;

      stats[home].played++;
      stats[away].played++;
      stats[home].gf += hScore;
      stats[home].ga += aScore;
      stats[away].gf += aScore;
      stats[away].ga += hScore;

      if (hScore > aScore) {
        stats[home].w++;
        stats[home].pts += 3;
        stats[away].l++;
      } else if (hScore < aScore) {
        stats[away].w++;
        stats[away].pts += 3;
        stats[home].l++;
      } else {
        stats[home].d++;
        stats[home].pts += 1;
        stats[away].d++;
        stats[away].pts += 1;
      }
    });

    return Object.values(stats).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (gdB !== gdA) return gdB - gdA;
      return b.gf - a.gf;
    });
  };

  // Calcular estadísticas sobre las apuestas de los jugadores de la sala
  const getRoomInsights = () => {
    if (!room || !room.participants || room.participants.length === 0) return null;

    const insights = {
      mostOptimistic: null, // Más goles predichos en total
      mostDefensive: null,  // Menos goles predichos en total
      favoriteTeam: '',     // Equipo con más victorias predichas
      totalPredictionsCount: 0
    };

    let maxGoals = -1;
    let minGoals = Infinity;
    const teamWinVotes = {};

    room.participants.forEach(p => {
      let userTotalGoals = 0;
      let hasPredictions = false;

      Object.keys(p.predictions).forEach(matchId => {
        const pred = p.predictions[matchId];
        // Ignorar predicciones ocultas o incompletas
        if (pred && pred.homeScore !== undefined && pred.homeScore !== null && !pred.hidden) {
          hasPredictions = true;
          const h = parseInt(pred.homeScore);
          const a = parseInt(pred.awayScore);
          userTotalGoals += (h + a);
          insights.totalPredictionsCount++;

          // Calcular qué equipo predijo que ganaría
          const match = matches.find(m => m.id === matchId);
          if (match) {
            if (h > a) {
              teamWinVotes[match.homeTeam] = (teamWinVotes[match.homeTeam] || 0) + 1;
            } else if (a > h) {
              teamWinVotes[match.awayTeam] = (teamWinVotes[match.awayTeam] || 0) + 1;
            }
          }
        }
      });

      if (hasPredictions) {
        if (userTotalGoals > maxGoals) {
          maxGoals = userTotalGoals;
          insights.mostOptimistic = { name: p.name, goals: userTotalGoals };
        }
        if (userTotalGoals < minGoals) {
          minGoals = userTotalGoals;
          insights.mostDefensive = { name: p.name, goals: userTotalGoals };
        }
      }
    });

    // Encontrar equipo favorito
    let maxVotes = 0;
    Object.keys(teamWinVotes).forEach(team => {
      if (teamWinVotes[team] > maxVotes) {
        maxVotes = teamWinVotes[team];
        insights.favoriteTeam = team;
      }
    });

    return insights;
  };

  const standings = getTeamStandings();
  const roomInsights = getRoomInsights();

  return (
    <div className="animate-fade">
      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setSubTab('tournament')}
          className="tab-btn"
          style={{ background: 'none', border: 'none', padding: '0.4rem 0.8rem', color: subTab === 'tournament' ? 'var(--secondary)' : 'var(--text-muted)', borderBottom: subTab === 'tournament' ? '2px solid var(--secondary)' : 'none', borderRadius: 0, fontWeight: 600 }}
        >
          ⚽ Goleadores y Tarjetas
        </button>
        <button
          onClick={() => setSubTab('teams')}
          className="tab-btn"
          style={{ background: 'none', border: 'none', padding: '0.4rem 0.8rem', color: subTab === 'teams' ? 'var(--secondary)' : 'var(--text-muted)', borderBottom: subTab === 'teams' ? '2px solid var(--secondary)' : 'none', borderRadius: 0, fontWeight: 600 }}
        >
          🏢 Tabla de Selecciones
        </button>
        <button
          onClick={() => setSubTab('roomInsights')}
          className="tab-btn"
          style={{ background: 'none', border: 'none', padding: '0.4rem 0.8rem', color: subTab === 'roomInsights' ? 'var(--secondary)' : 'var(--text-muted)', borderBottom: subTab === 'roomInsights' ? '2px solid var(--secondary)' : 'none', borderRadius: 0, fontWeight: 600 }}
        >
          📊 Apuestas de la Sala
        </button>
      </div>

      {/* Contenido Sub Tab 1: Goleadores y Tarjetas */}
      {subTab === 'tournament' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Tabla de Goleadores */}
          <div className="card">
            <div className="card-title">⚽ Máximos Goleadores</div>
            <div className="table-container">
              <table className="table-posiciones" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Jugador</th>
                    <th>Selección</th>
                    <th style={{ textAlign: 'center' }}>Goles</th>
                  </tr>
                </thead>
                <tbody>
                  {tournamentStats.goalscorers.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Cargando goleadores...</td>
                    </tr>
                  ) : (
                    tournamentStats.goalscorers.map((g, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '600' }}>{g.name}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>{getFlag(g.team)}</span>
                            <span>{g.team}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '800', color: 'var(--primary)' }}>{g.goals}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla de Tarjetas */}
          <div className="card">
            <div className="card-title">🟨 Ranking Fair Play / Tarjetas</div>
            <div className="table-container">
              <table className="table-posiciones" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Selección</th>
                    <th style={{ textAlign: 'center' }}>Amarillas 🟨</th>
                    <th style={{ textAlign: 'center' }}>Rojas 🟥</th>
                  </tr>
                </thead>
                <tbody>
                  {tournamentStats.cards.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Cargando tarjetas...</td>
                    </tr>
                  ) : (
                    tournamentStats.cards.map((c, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '600' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>{getFlag(c.team)}</span>
                            <span>{c.team}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#f59e0b' }}>{c.yellow}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#ef4444' }}>{c.red}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Contenido Sub Tab 2: Tabla del Mundial */}
      {subTab === 'teams' && (
        <div className="card">
          <div className="card-title">🏢 Posiciones Generales del Mundial (Fase de Grupos)</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            Calculada dinámicamente según los resultados reales de los partidos jugados en el torneo.
          </p>
          <div className="table-container">
            <table className="table-posiciones" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>Pos</th>
                  <th>Selección</th>
                  <th style={{ textAlign: 'center' }}>PJ</th>
                  <th style={{ textAlign: 'center' }}>G</th>
                  <th style={{ textAlign: 'center' }}>E</th>
                  <th style={{ textAlign: 'center' }}>P</th>
                  <th style={{ textAlign: 'center' }}>GF</th>
                  <th style={{ textAlign: 'center' }}>GA</th>
                  <th style={{ textAlign: 'center' }}>DG</th>
                  <th style={{ textAlign: 'center', fontWeight: 'bold' }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Aún no hay partidos jugados cargados.</td>
                  </tr>
                ) : (
                  standings.map((s, idx) => {
                    const gd = s.gf - s.ga;
                    return (
                      <tr key={s.team}>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                        <td style={{ fontWeight: '600' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>{getFlag(s.team)}</span>
                            <span>{s.team}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{s.played}</td>
                        <td style={{ textAlign: 'center' }}>{s.w}</td>
                        <td style={{ textAlign: 'center' }}>{s.d}</td>
                        <td style={{ textAlign: 'center' }}>{s.l}</td>
                        <td style={{ textAlign: 'center' }}>{s.gf}</td>
                        <td style={{ textAlign: 'center' }}>{s.ga}</td>
                        <td style={{ textAlign: 'center', color: gd > 0 ? 'var(--primary)' : gd < 0 ? 'var(--error)' : 'var(--text-muted)' }}>
                          {gd > 0 ? `+${gd}` : gd}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.95rem' }}>{s.pts}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contenido Sub Tab 3: Apuestas de la Sala */}
      {subTab === 'roomInsights' && (
        <div className="card animate-fade">
          <div className="card-title">📊 Estadísticas y Apuestas de la Sala</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Estadísticas curiosas recopiladas a partir de las predicciones de todos los jugadores de esta sala.
          </p>

          {!roomInsights || !roomInsights.mostOptimistic ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No hay suficientes apuestas cargadas para mostrar estadísticas de la sala todavía.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              
              {/* Tarjeta 1: Más Optimista */}
              <div className="card" style={{ background: 'rgba(16, 185, 129, 0.03)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔥</div>
                <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.25rem' }}>El Más Goleador (Optimista)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>
                  {roomInsights.mostOptimistic.name}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Apostó un total de <strong style={{ color: 'var(--text-main)' }}>{roomInsights.mostOptimistic.goals} goles</strong> en todas sus predicciones.
                </p>
              </div>

              {/* Tarjeta 2: Más Defensivo */}
              <div className="card" style={{ background: 'rgba(59, 130, 246, 0.03)', borderColor: 'rgba(59, 130, 246, 0.15)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
                <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.25rem' }}>El Más Defensivo</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--info)' }}>
                  {roomInsights.mostDefensive.name}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Apostó un total de solo <strong style={{ color: 'var(--text-main)' }}>{roomInsights.mostDefensive.goals} goles</strong> en todas sus predicciones.
                </p>
              </div>

              {/* Tarjeta 3: Favorito de la Sala */}
              {roomInsights.favoriteTeam && (
                <div className="card" style={{ background: 'rgba(245, 158, 11, 0.03)', borderColor: 'rgba(245, 158, 11, 0.15)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⭐</div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.25rem' }}>Favorito de la Sala</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>{getFlag(roomInsights.favoriteTeam)}</span>
                    <span>{roomInsights.favoriteTeam}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Es la selección que más victorias tiene pronosticadas por los miembros de esta sala.
                  </p>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}
