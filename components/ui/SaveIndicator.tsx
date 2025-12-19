import React from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved';

interface Props {
    status: SaveStatus;
}

export const SaveIndicator: React.FC<Props> = ({ status }) => {
    if (status === 'idle') return null;

    return (
        <div className={`transition-opacity duration-1000 ${status === 'saved' ? 'opacity-0' : 'opacity-100'}`}>
            {/* We wrap the fading logic in a parent or handle it via CSS animation on the 'saved' state? 
            User said: "after 1s slowly remove". 
            If I return null on 'idle', it vanishes instantly.
            The parent needs to stick to 'saved' for 1s, then switch to 'idle'.
            So when status IS 'saved', we show the static red circle. 
            The fading should be handled? 
            Actually, let's keep it simple: 
            'saving' -> show spinner
            'saved' -> show static
            'idle' -> render nothing (or transparent)
        */}
            <div
                className={`w-3 h-3 rounded-full border-2 border-red-500 ${status === 'saving'
                        ? 'border-t-transparent animate-spin'
                        : 'bg-red-500'
                    }`}
            />
        </div>
    );
};
