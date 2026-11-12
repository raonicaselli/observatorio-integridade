import React from 'react'

export default function ProcessReference({ number }) {
 if (!number) return null
 return <p className="process-reference"><strong>Processo:</strong> {number}</p>
}
