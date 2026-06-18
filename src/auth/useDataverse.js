import { useState, useEffect, useRef } from 'react';
import { useMsal } from '@azure/msal-react';
import { dataverseScopes, DATAVERSE_URL } from './msalConfig';

async function fetchAllPages(url, headers) {
  const results = [];
  let next = url;
  while (next) {
    const res = await window.fetch(next, { headers });
    if (!res.ok) throw new Error(`Dataverse error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    results.push(...(json.value ?? []));
    // Dataverse sends @odata.nextLink for pages beyond the first
    next = json['@odata.nextLink'] ?? null;
  }
  return results;
}

export function useDataverse(table, odata = '') {
  const { instance, accounts } = useMsal();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const cacheRef              = useRef({});

  useEffect(() => {
    if (!accounts.length || !table) {
      setLoading(false);
      return;
    }

    const cacheKey = `${table}?${odata}`;
    if (cacheRef.current[cacheKey]) {
      setData(cacheRef.current[cacheKey]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { accessToken } = await instance.acquireTokenSilent({
          scopes:  dataverseScopes,
          account: accounts[0],
        });

        const headers = {
          Authorization:  `Bearer ${accessToken}`,
          Accept:         'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version':    '4.0',
          // return display names for all lookup / option-set fields
          'Prefer': 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
        };

        const url = `${DATAVERSE_URL}/${table}${odata ? `?${odata}` : ''}`;
        // expose token for one-time dev metadata queries in mapper
        window.__dvToken = accessToken;

        const results = await fetchAllPages(url, headers);

        if (!cancelled) {
          cacheRef.current[cacheKey] = results;
          setData(results);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [instance, accounts, table, odata]);

  return { data, loading, error };
}
