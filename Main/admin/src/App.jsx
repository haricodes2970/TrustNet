import { BrowserRouter } from 'react-router-dom';
import AdminRoutes from './routes/AdminRoutes';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AdminRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
