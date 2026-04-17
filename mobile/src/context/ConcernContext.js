import React, { createContext, useContext, useState, useEffect } from "react";
import { ConcernService } from "../services/concernService";
import { useAuth } from "./AuthContext";

const ConcernContext = createContext(null);

export function ConcernProvider({ children }) {
  const [concerns, setConcerns] = useState([]);
  const [myConcerns, setMyConcerns] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const loadData = React.useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const all = await ConcernService.getConcerns();
      setConcerns(all);
      const mine = all.filter(c => c.user_id === user.id);
      setMyConcerns(mine);
    } catch {} finally {
      setLoading(false);
    }
  }, [user?.id]);
  
  useEffect(() => {
    if (!user?.id) {
      setConcerns([]);
      setMyConcerns([]);
      setLoading(false);
      return;
    }
    loadData();
  }, [loadData, user?.id]);

  const refreshConcerns = async () => {
    await loadData();
  };

  const addConcern = async (data) => {
    const res = await ConcernService.addConcern({
      ...data,
      userId: user.id,
      userName: user.name,
      userBarangay: user.barangay,
    });
    loadData();
    return res;
  };

  const updateConcern = async (id, updates) => {};

  const deleteConcern = async (id) => {
    await ConcernService.deleteConcern(id);
    loadData();
  };

  const toggleUpvote = async (concernId) => {
    await ConcernService.toggleUpvote(concernId);
    loadData();
  };

  return (
    <ConcernContext.Provider
      value={{
        concerns,
        myConcerns,
        loading,
        addConcern,
        updateConcern,
        deleteConcern,
        toggleUpvote,
        refreshConcerns,
      }}
    >
      {children}
    </ConcernContext.Provider>
  );
}

export const useConcerns = () => useContext(ConcernContext);
