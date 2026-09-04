import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

// Admin-managed launch cities. Empty list = app is unrestricted (default,
// pre-launch-config state). Once the admin adds cities, trip/parcel posting
// is limited to routes between them — see PostTripModal / PostParcelModal.
const ServiceAreaContext = createContext({ cities: [], cityNames: [], isRestricted: false, loading: true });

export const ServiceAreaProvider = ({ children }) => {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/cities').then(({ data }) => setCities(data.cities || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cityNames = cities.map(c => c.city);

  return (
    <ServiceAreaContext.Provider value={{ cities, cityNames, isRestricted: cityNames.length > 0, loading }}>
      {children}
    </ServiceAreaContext.Provider>
  );
};

export const useServiceArea = () => useContext(ServiceAreaContext);
