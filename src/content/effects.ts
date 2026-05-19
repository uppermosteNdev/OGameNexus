export function flyToNexusButton(startElement: Element, imageUrls: string[]) {
    const targetBtn = document.querySelector("#og-nexus-icon-modal-btn");
    if (!targetBtn) return;

    const startRect = startElement.getBoundingClientRect();
    const targetRect = targetBtn.getBoundingClientRect();

    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    // Pulse and 'eating' dash glow effect on the button
    const triggerEatingEffect = () => {
        targetBtn.classList.add('og-nexus-button-eating');
        setTimeout(() => {
            targetBtn.classList.remove('og-nexus-button-eating');
        }, 1000); // Remove after animation duration + some buffer
    };

    // Create particles for each image
    imageUrls.forEach((imgUrl, i) => {
        // Create 2-3 particles per image for a rushing effect
        for (let j = 0; j < 3; j++) {
            setTimeout(() => {
                const particle = document.createElement('img');
                particle.src = imgUrl;
                particle.style.cssText = `
                    position: fixed;
                    z-index: 9999999;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    pointer-events: none;
                    box-shadow: 0 0 10px rgba(56,189,248,0.8);
                    left: ${startRect.left + startRect.width / 2}px;
                    top: ${startRect.top + startRect.height / 2}px;
                    transform: translate(-50%, -50%);
                `;
                document.body.appendChild(particle);

                // Initial random scatter then fly to target
                const scatterX = (Math.random() - 0.5) * 60;
                const scatterY = (Math.random() - 0.5) * 60;

                const anim = particle.animate([
                    {
                        left: `${startRect.left + startRect.width / 2}px`,
                        top: `${startRect.top + startRect.height / 2}px`,
                        transform: 'translate(-50%, -50%) scale(0.5)',
                        opacity: 0
                    },
                    {
                        left: `${startRect.left + startRect.width / 2 + scatterX}px`,
                        top: `${startRect.top + startRect.height / 2 + scatterY}px`,
                        transform: 'translate(-50%, -50%) scale(1.2)',
                        opacity: 1,
                        offset: 0.2
                    },
                    {
                        left: `${targetX}px`,
                        top: `${targetY}px`,
                        transform: 'translate(-50%, -50%) scale(0.3)',
                        opacity: 0.8,
                        offset: 1
                    }
                ], {
                    duration: 600 + Math.random() * 300,
                    easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
                });

                anim.onfinish = () => {
                    particle.remove();
                    triggerEatingEffect();
                };
            }, i * 100 + j * 50);
        }
    });
}
