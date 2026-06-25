import React, { useState, useEffect } from 'react';
import Leaderboard from './components/Leaderboard';
import PredictForm from './components/PredictForm';
import AllPredictions from './components/AllPredictions';
import AdminPanel from './components/AdminPanel';
import StatsView from './components/StatsView';

// URLs de API (utiliza proxies de Vite en desarrollo, o ruta relativa en prod)
const API_BASE = '';

export default function App() {
  // Enrutamiento simple basado en Hash
  const [currentRoute, setCurrentRoute] = useState({ path: 'landing', params: {} });
  
  // Estados de datos
  const [matches, setMatches] = useState([]);
  const [room, setRoom] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');
  
  // Estado de pestañas
  const [activeTab, setActiveTab] = useState('leaderboard'); // leaderboard, predict, all, admin
  
  // Estados de carga y alertas
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Parsear ruta al iniciar y cuando cambia el hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/';
      
      if (hash === '#/' || hash === '#') {
        setCurrentRoute({ path: 'landing', params: {} });
      } else if (hash.startsWith('#/join/')) {
        const roomId = hash.replace('#/join/', '');
        setCurrentRoute({ path: 'join', params: { roomId } });
      } else if (hash.startsWith('#/room/')) {
        const roomId = hash.replace('#/room/', '');
        setCurrentRoute({ path: 'room', params: { roomId } });
      } else {
        // Por defecto redirigir a landing
        window.location.hash = '#/';
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Ejecutar al montar

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Cargar lista de partidos global al iniciar la aplicación
  const loadMatches = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/matches`);
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (e) {
      console.error('Error al cargar partidos:', e);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  // Cargar detalles de la sala y restaurar sesión si aplica
  useEffect(() => {
    if (currentRoute.path === 'room') {
      const { roomId } = currentRoute.params;
      
      // Intentar obtener el ID del usuario de localStorage
      const savedUserId = localStorage.getItem(`prode_room_${roomId}`);
      const savedUserName = localStorage.getItem(`prode_room_username_${roomId}`);
      
      if (savedUserId) {
        setCurrentUserId(savedUserId);
        setCurrentUserName(savedUserName || '');
        loadRoomDetails(roomId, savedUserId);
      } else {
        // Redirigir a unirse si no hay sesión para esta sala
        window.location.hash = `#/join/${roomId}`;
      }
    } else if (currentRoute.path === 'join') {
      const { roomId } = currentRoute.params;
      // Si el usuario ya está unido, redirigir a la sala
      const savedUserId = localStorage.getItem(`prode_room_${roomId}`);
      if (savedUserId) {
        window.location.hash = `#/room/${roomId}`;
      } else {
        // Cargar metadatos básicos de la sala
        loadRoomDetails(roomId, null);
      }
    } else {
      // Limpiar estados al salir a la landing
      setRoom(null);
      setCurrentUserId(null);
      setCurrentUserName('');
    }
  }, [currentRoute]);

  const loadRoomDetails = async (roomId, userId) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const queryParam = userId ? `?userId=${userId}` : '';
      const res = await fetch(`${API_BASE}/api/rooms/${roomId}${queryParam}`);
      if (res.ok) {
        const data = await res.json();
        setRoom(data);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Error al cargar los detalles de la sala');
        // Si la sala no existe y estábamos intentando entrar, volver a landing
        if (res.status === 404) {
          setTimeout(() => {
            window.location.hash = '#/';
          }, 3000);
        }
      }
    } catch (e) {
      setErrorMsg('No se pudo conectar con el servidor de la API');
    } finally {
      setLoading(false);
    }
  };

  // --- Acciones de Formulario ---

  // Crear una nueva sala
  const handleCreateRoom = async (roomName, creatorName) => {
    if (!roomName.trim() || !creatorName.trim()) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName, creatorName })
      });

      if (res.ok) {
        const data = await res.json();
        // Guardar sesión en localStorage
        localStorage.setItem(`prode_room_${data.roomId}`, data.userId);
        localStorage.setItem(`prode_room_username_${data.roomId}`, creatorName);
        
        setCurrentUserId(data.userId);
        setCurrentUserName(creatorName);
        
        // Redirigir a la sala
        window.location.hash = `#/room/${data.roomId}`;
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Error al crear la sala');
      }
    } catch (e) {
      setErrorMsg('Error de red al intentar crear la sala.');
    } finally {
      setLoading(false);
    }
  };

  // Unirse a una sala existente
  const handleJoinRoom = async (roomId, participantName) => {
    if (!participantName.trim()) {
      setErrorMsg('El nombre es requerido.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: participantName })
      });

      if (res.ok) {
        const data = await res.json();
        // Guardar sesión en localStorage
        localStorage.setItem(`prode_room_${roomId}`, data.userId);
        localStorage.setItem(`prode_room_username_${roomId}`, data.name);
        
        setCurrentUserId(data.userId);
        setCurrentUserName(data.name);
        
        // Redirigir a la sala
        window.location.hash = `#/room/${roomId}`;
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Error al unirse a la sala');
      }
    } catch (e) {
      setErrorMsg('Error de red al unirse a la sala.');
    } finally {
      setLoading(false);
    }
  };

  // Guardar pronósticos
  const handleSavePredictions = async (predictions) => {
    const { roomId } = currentRoute.params;
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${roomId}/users/${currentUserId}/predictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions })
      });

      if (res.ok) {
        // Mostrar Toast de éxito
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        
        // Recargar sala para ver cambios en la tabla
        loadRoomDetails(roomId, currentUserId);
        return true;
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar pronósticos');
        return false;
      }
    } catch (e) {
      alert('Error de red al guardar pronósticos.');
      return false;
    }
  };

  // Actualizar un partido (Admin)
  const handleUpdateMatch = async (matchId, payload) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/matches/${matchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Recargar partidos globales
        await loadMatches();
        // Recargar detalles de sala para recalcular posiciones
        if (room) {
          await loadRoomDetails(room.id, currentUserId);
        }
        return true;
      } else {
        const err = await res.json();
        alert(err.error || 'Error al actualizar el partido');
        return false;
      }
    } catch (e) {
      alert('Error de red al actualizar partido.');
      return false;
    }
  };

  // Salir de la sala (Cerrar Sesión)
  const handleLogout = () => {
    if (window.confirm('¿Quieres salir de esta sala? Tus pronósticos guardados no se perderán, pero tendrás que usar el enlace de acceso o unirte con el mismo nombre para volver a entrar.')) {
      const { roomId } = currentRoute.params;
      localStorage.removeItem(`prode_room_${roomId}`);
      localStorage.removeItem(`prode_room_username_${roomId}`);
      window.location.hash = '#/';
    }
  };

  // Copiar link de invitación
  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}#/join/${room.id}`;
    navigator.clipboard.writeText(inviteUrl);
    setSuccessMsg('¡Enlace de invitación copiado al portapapeles!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

const Landing = ({ handleCreateRoom, errorMsg, loading }) => {
  const [roomNameInput, setRoomNameInput] = useState('');
  const [userNameInput, setUserNameInput] = useState('');
  const [existingCode, setExistingCode] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleCreateRoom(roomNameInput, userNameInput);
  };

  const handleEnterExisting = (e) => {
    e.preventDefault();
    if (existingCode.trim()) {
      window.location.hash = `#/room/${existingCode.trim()}`;
    }
  };

  return (
    <div className="landing-grid animate-fade">
      <div className="landing-hero">
        <h1>Pálpito del Mundial 2026.</h1>
        <p>
          Crea tu Prode de forma minimalista, rápida y sin registros complicados. Invita a tus amigos por enlace y compitan en tiempo real por el trono del mejor pronosticador.
        </p>

        <div className="features-list">
          <div className="feature-item">
            <span className="feature-icon">🏆</span>
            <div>
              <div className="feature-title">Tabla de Posiciones Inteligente</div>
              <div className="feature-desc">Puntajes en vivo: 3 puntos por resultado exacto, 1 punto por acertar ganador/empate.</div>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔒</span>
            <div>
              <div className="feature-title">Privacidad Anti-Copia</div>
              <div className="feature-desc">Las predicciones de partidos futuros están ocultas para los demás participantes para que nadie copie tus pronósticos a último minuto.</div>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <div>
              <div className="feature-title">Matriz Comparativa</div>
              <div className="feature-desc">Una vista completa de cuadrícula para ver y comparar los pálpitos de todos apenas empiece el juego.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <form onSubmit={handleFormSubmit}>
          <div className="card-title" style={{ fontSize: '1.4rem' }}>
            ⚡ Crear nuevo Prode
          </div>
          
          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {errorMsg}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nombre de tu Torneo / Sala</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej. Prode Oficina 2026"
              value={roomNameInput}
              onChange={(e) => setRoomNameInput(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tu Nombre Completo o Apodo</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej. Lionel M."
              value={userNameInput}
              onChange={(e) => setUserNameInput(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem' }} disabled={loading}>
            {loading ? 'Creando...' : 'Crear Sala y Jugar ⚽'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-dark)', fontSize: '0.85rem' }}>
          <span style={{ flex: 1, height: '1px', background: 'var(--card-border)' }}></span>
          <span>O ÚNETE A UNA SALA</span>
          <span style={{ flex: 1, height: '1px', background: 'var(--card-border)' }}></span>
        </div>

        <form onSubmit={handleEnterExisting} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Código de sala (ej. mundial-demo)"
            value={existingCode}
            onChange={(e) => setExistingCode(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-secondary">
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
};

const Join = ({ roomId, room, errorMsg, loading, handleJoinRoom }) => {
  const [joinNameInput, setJoinNameInput] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleJoinRoom(roomId, joinNameInput);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }} className="animate-fade">
      <div className="card" style={{ width: '100%', maxWidth: '450px' }}>
        <div className="card-title" style={{ fontSize: '1.4rem', justifyContent: 'center' }}>
          🏆 Te invitaron a jugar
        </div>
        
        {room ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '1.05rem' }}>
            Únete a la sala: <strong style={{ color: 'var(--secondary)' }}>{room.name}</strong>
          </p>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Cargando sala...
          </p>
        )}

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">Ingresa tu Nombre para Registrarte</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej. Diego M."
              value={joinNameInput}
              onChange={(e) => setJoinNameInput(e.target.value)}
              disabled={loading || !room}
              required
              autoFocus
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.8rem' }} 
            disabled={loading || !room}
          >
            {loading ? 'Uniéndose...' : 'Unirse y Pronosticar ⚽'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <a href="#/" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            ← Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
};

// ... (dentro del componente App)

  // --- RENDERIZADO DE PANTALLAS ---

  // Pantalla 3: Sala Dashboard Principal
  const renderRoom = () => {
    if (!room) {
      return (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }} className="animate-fade">
          {errorMsg ? (
            <div style={{ color: 'var(--error)' }}>
              <h3>⚠️ Error</h3>
              <p>{errorMsg}</p>
            </div>
          ) : (
            <p>Cargando detalles de la sala...</p>
          )}
        </div>
      );
    }

    // Buscar los datos del usuario actual dentro de los participantes de la sala
    const currentUserData = room.participants.find(p => p.id === currentUserId);
    const isAdmin = room.adminId === currentUserId;

    return (
      <div className="animate-fade">
        {/* Detalles de la sala */}
        <div className="room-header-details">
          <div className="room-title-info">
            <h2>{room.name}</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.25rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Participando como: <strong style={{ color: 'var(--text-main)' }}>{currentUserName}</strong>
              </span>
              <span style={{ width: '4px', height: '4px', background: 'var(--card-border)', borderRadius: '50%' }}></span>
              <button 
                onClick={handleLogout} 
                style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
              >
                Cerrar Sesión (Salir)
              </button>
            </div>
          </div>

          <div className="room-invite-box">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Invitar:</span>
            <input 
              type="text" 
              className="invite-input-readonly" 
              value={`${window.location.origin}${window.location.pathname}#/join/${room.id}`} 
              readOnly 
              onClick={(e) => e.target.select()}
            />
            <button onClick={handleCopyInviteLink} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
              📋 Copiar Enlace
            </button>
          </div>
        </div>

        {successMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.75rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', transition: 'all 0.3s ease' }}>
            {successMsg}
          </div>
        )}

        {/* Pestañas de Navegación */}
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            🏆 Tabla de Posiciones
          </button>
          <button 
            className={`tab-btn ${activeTab === 'predict' ? 'active' : ''}`}
            onClick={() => setActiveTab('predict')}
          >
            ⚽ Mis Pronósticos
          </button>
          <button 
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            👥 Pronósticos de Todos
          </button>
          <button 
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 Estadísticas
          </button>
          {isAdmin && (
            <button 
              className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
              style={{ borderLeft: '1px solid var(--card-border)', paddingLeft: '1rem', marginLeft: '0.5rem' }}
            >
              ⚙️ Admin Resultados
            </button>
          )}
        </div>

        {/* Contenido según pestaña */}
        {activeTab === 'leaderboard' && (
          <Leaderboard participants={room.participants} currentUserId={currentUserId} />
        )}

        {activeTab === 'predict' && (
          <PredictForm 
            matches={matches} 
            initialPredictions={currentUserData ? currentUserData.predictions : {}}
            onSavePredictions={handleSavePredictions}
          />
        )}

        {activeTab === 'all' && (
          <AllPredictions 
            matches={matches} 
            participants={room.participants} 
            currentUserId={currentUserId} 
          />
        )}

        {activeTab === 'stats' && (
          <StatsView 
            matches={matches} 
            room={room} 
          />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminPanel 
            matches={matches} 
            onUpdateMatch={handleUpdateMatch} 
          />
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Header Común */}
      <header className="app-header">
        <div className="logo-container" onClick={() => window.location.hash = '#/'}>
          <span className="logo-icon">⚽</span>
          <span className="logo-text">PRODE MUNDIAL</span>
          <span className="logo-badge">2026</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {currentRoute.path === 'room' ? (
            <span>Código de Sala: <strong style={{ color: 'var(--text-main)' }}>{room?.id}</strong></span>
          ) : (
            <span>Pronósticos de fútbol online</span>
          )}
        </div>
      </header>

      {/* Renders según ruta actual */}
      {currentRoute.path === 'landing' && (
        <Landing handleCreateRoom={handleCreateRoom} errorMsg={errorMsg} loading={loading} />
      )}
      {currentRoute.path === 'join' && (
        <Join 
          roomId={currentRoute.params.roomId} 
          room={room} 
          errorMsg={errorMsg} 
          loading={loading} 
          handleJoinRoom={handleJoinRoom} 
        />
      )}
      {currentRoute.path === 'room' && renderRoom()}

      {/* Floating Save Toast Notification */}
      {showToast && (
        <div className="save-toast">
          <span>💾</span> Pronósticos guardados con éxito
        </div>
      )}
    </div>
  );
}
