import React, { useRef, useEffect } from 'react';

const SynthwaveBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        let animationFrameId: number;
        
        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        const gridColor = '#f0f'; // Fuchsia
        const horizonColor = '#0ff'; // Cyan
        
        let time = 0;

        const stars = Array.from({ length: 500 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height * 0.5,
            size: Math.random() * 1.5,
            speed: Math.random() * 0.1 + 0.05
        }));

        const draw = () => {
            time += 0.005;

            // Clear canvas with a gradient for the sky
            const sky = ctx.createLinearGradient(0, 0, 0, height * 0.5);
            sky.addColorStop(0, '#0a0a1f');
            sky.addColorStop(1, '#1a1a3e');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);

            // Draw stars
            ctx.fillStyle = '#fff';
            for (const star of stars) {
                star.x = (star.x - star.speed + width) % width;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw sun
            const sunX = width / 2;
            const sunY = height / 2;
            const sunRadius = Math.min(width, height) / 8;

            const sunGradient = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.5, sunX, sunY, sunRadius);
            sunGradient.addColorStop(0, 'rgba(255, 220, 150, 0.8)');
            sunGradient.addColorStop(0.5, 'rgba(255, 120, 100, 0.4)');
            sunGradient.addColorStop(1, 'rgba(255, 100, 150, 0)');
            
            ctx.fillStyle = sunGradient;
            ctx.fillRect(0, 0, width, height);
            
            // Draw horizontal sun lines
            ctx.strokeStyle = 'rgba(255, 220, 150, 0.4)';
            ctx.lineWidth = 1;
            for(let i = 0; i < 10; i++) {
                const y = sunY + i * 4;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            // Draw perspective grid
            const horizon = height / 2;
            const perspective = width * 0.8;
            
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 10;
            ctx.shadowColor = gridColor;

            for (let i = 0; i < 50; i++) {
                const z = (i + time) % 1; // Animate grid movement
                const y = horizon + z * z * (height / 2);

                // Horizontal lines
                if (y < height) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(width, y);
                    ctx.stroke();
                }
            }

            // Vertical lines
            for (let i = -20; i <= 20; i++) {
                const x = width / 2 + i * 40;
                
                const px = width / 2;
                const py = horizon;
                
                const dx = x - px;
                const dy = height - py;
                
                const vanishingX = px + dx * (perspective / (perspective + 1000));
                const vanishingY = py + dy * (perspective / (perspective + 1000));

                ctx.beginPath();
                ctx.moveTo(x, height);
                ctx.lineTo(vanishingX, vanishingY);
                ctx.stroke();
            }
            
            ctx.shadowBlur = 0;
            
            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId);
             window.removeEventListener('resize', () => {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
            });
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-[-1]"></canvas>;
};

export default SynthwaveBackground;
