'use client'

import { useEffect, useRef, useCallback } from 'react';

const STYLES = `
  .final-research-credit {
    text-align: center;
  }

  .final-research-credit a {
    position: relative;
    display: inline-block;
    text-decoration: none;
    color: inherit;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .final-research-default {
    display: inline-block;
    visibility: visible;
    transition: visibility 0s, opacity 0.2s ease;
  }

  .final-research-hover {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    visibility: hidden;
    white-space: nowrap;
  }

  .final-research-credit a:hover .final-research-hover {
    opacity: 1;
    visibility: visible;
  }

  .final-research-credit a:hover .final-research-default {
    visibility: hidden;
  }
`;

export default function FinalResearchCredit() {
  const linkRef = useRef(null);
  const hoverRef = useRef(null);
  const defaultRef = useRef(null);
  const svgRef = useRef(null);
  const isHoveringRef = useRef(false);

  const isMobile = useCallback(() => {
    return window.innerWidth <= 724 || 'ontouchstart' in window;
  }, []);

  const getThemeColor = useCallback(() => {
    const computedStyle = getComputedStyle(document.documentElement);
    return computedStyle.getPropertyValue('--color-text').trim() || '#000000';
  }, []);

  const removeCornerLines = useCallback(() => {
    if (svgRef.current) {
      svgRef.current.remove();
      svgRef.current = null;
    }
  }, []);

  const createCornerLines = useCallback(() => {
    removeCornerLines();

    requestAnimationFrame(() => {
      const hoverEl = hoverRef.current;
      if (!hoverEl) return;

      const rect = hoverEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const color = getThemeColor();

      const screenCorners = [
        { x: 0, y: 0 },
        { x: vw, y: 0 },
        { x: 0, y: vh },
        { x: vw, y: vh },
      ];

      const blockCorners = [
        { x: rect.left, y: rect.top },
        { x: rect.right, y: rect.top },
        { x: rect.left, y: rect.bottom },
        { x: rect.right, y: rect.bottom },
      ];

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'final-research-corner-lines');
      svg.style.cssText = `
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2147483647;
        overflow: visible;
      `;
      svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');

      // Lines from screen corners to text corners
      screenCorners.forEach((sc, i) => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', sc.x);
        line.setAttribute('y1', sc.y);
        line.setAttribute('x2', blockCorners[i].x);
        line.setAttribute('y2', blockCorners[i].y);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '1');
        svg.appendChild(line);
      });

      // Viewport border rects
      const borders = [
        { x: 0, y: 0, w: vw, h: 1.5 },
        { x: 0, y: vh - 1.5, w: vw, h: 1.5 },
        { x: 0, y: 0, w: 1.5, h: vh },
        { x: vw - 1.5, y: 0, w: 1.5, h: vh },
      ];
      borders.forEach(({ x, y, w, h }) => {
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('x', x);
        r.setAttribute('y', y);
        r.setAttribute('width', w);
        r.setAttribute('height', h);
        r.setAttribute('fill', color);
        svg.appendChild(r);
      });

      document.body.appendChild(svg);
      svgRef.current = svg;
    });
  }, [removeCornerLines, getThemeColor]);

  useEffect(() => {
    // Inject styles
    if (!document.getElementById('final-research-styles')) {
      const style = document.createElement('style');
      style.id = 'final-research-styles';
      style.textContent = STYLES;
      document.head.appendChild(style);
    }

    const link = linkRef.current;
    if (!link) return;

    const showHoverState = () => {
      if (defaultRef.current) defaultRef.current.style.visibility = 'hidden';
      if (hoverRef.current) {
        hoverRef.current.style.opacity = '1';
        hoverRef.current.style.visibility = 'visible';
      }
    };

    const hideHoverState = () => {
      if (defaultRef.current) defaultRef.current.style.visibility = 'visible';
      if (hoverRef.current) {
        hoverRef.current.style.opacity = '0';
        hoverRef.current.style.visibility = 'hidden';
      }
    };

    const handleClick = (e) => {
      if (isMobile()) {
        e.preventDefault();
        showHoverState();
        createCornerLines();
        setTimeout(() => {
          removeCornerLines();
          hideHoverState();
          window.open(link.href, '_blank', 'noopener,noreferrer');
        }, 1500);
      }
    };

    const handleMouseEnter = () => {
      isHoveringRef.current = true;
      if (!isMobile()) createCornerLines();
    };

    const handleMouseLeave = () => {
      isHoveringRef.current = false;
      if (!isMobile()) removeCornerLines();
    };

    const handleResize = () => {
      if (isHoveringRef.current && svgRef.current) createCornerLines();
    };

    const handleScroll = () => {
      if (isHoveringRef.current && svgRef.current) createCornerLines();
    };

    link.addEventListener('click', handleClick);
    link.addEventListener('mouseenter', handleMouseEnter);
    link.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      link.removeEventListener('click', handleClick);
      link.removeEventListener('mouseenter', handleMouseEnter);
      link.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      removeCornerLines();
    };
  }, [isMobile, createCornerLines, removeCornerLines]);

  return (
    <div className="final-research-credit">
      <a
        ref={linkRef}
        href="https://www.finalresearch.org/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="final-research-default" ref={defaultRef}>
          Website by FINAL RESEARCH
        </span>
        <span className="final-research-hover" ref={hoverRef}>
          FINALRESEARCH.ORG
        </span>
      </a>
    </div>
  );
}
