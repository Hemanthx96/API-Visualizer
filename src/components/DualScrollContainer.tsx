import { useEffect, useRef, ReactNode } from "react";

interface DualScrollContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Container with synchronized top and bottom horizontal scrollbars.
 * Useful for wide content where users want to scroll from either end.
 */
export const DualScrollContainer = ({
  children,
  className = "",
}: DualScrollContainerProps): JSX.Element => {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const topSpacerRef = useRef<HTMLDivElement>(null);
  const bottomSpacerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Sync scroll positions between top and bottom scrollbars
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const bottomScroll = bottomScrollRef.current;
    const content = contentRef.current;
    const topSpacer = topSpacerRef.current;
    const bottomSpacer = bottomSpacerRef.current;

    if (!topScroll || !bottomScroll || !content || !topSpacer || !bottomSpacer) return;

    const updateScrollbarWidths = () => {
      // Use requestAnimationFrame to ensure DOM is fully laid out
      requestAnimationFrame(() => {
        // Measure the content element (which has overflow: auto)
        const scrollWidth = content.scrollWidth;
        const clientWidth = content.clientWidth;
        
        // Show scrollbars only if content is wider than container
        const hasOverflow = scrollWidth > clientWidth;
        
        if (hasOverflow) {
          // Set spacer width to match content width
          topSpacer.style.width = `${scrollWidth}px`;
          bottomSpacer.style.width = `${scrollWidth}px`;
          
          // Show scrollbars
          topScroll.style.display = "block";
          bottomScroll.style.display = "block";
          
          // Sync scroll positions
          const scrollLeft = content.scrollLeft;
          if (topScroll.scrollLeft !== scrollLeft) {
            topScroll.scrollLeft = scrollLeft;
          }
          if (bottomScroll.scrollLeft !== scrollLeft) {
            bottomScroll.scrollLeft = scrollLeft;
          }
        } else {
          // Hide scrollbars when no overflow
          topScroll.style.display = "none";
          bottomScroll.style.display = "none";
        }
      });
    };

    const syncScroll = (source: HTMLDivElement, targets: HTMLDivElement[]) => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;
      const scrollLeft = source.scrollLeft;
      targets.forEach((target) => {
        if (target.scrollLeft !== scrollLeft) {
          target.scrollLeft = scrollLeft;
        }
      });
      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    };

    const handleTopScroll = () => {
      syncScroll(topScroll, [bottomScroll, content]);
    };
    
    const handleBottomScroll = () => {
      syncScroll(bottomScroll, [topScroll, content]);
    };
    
    const handleContentScroll = () => {
      if (isScrollingRef.current) return;
      syncScroll(content, [topScroll, bottomScroll]);
    };

    topScroll.addEventListener("scroll", handleTopScroll);
    bottomScroll.addEventListener("scroll", handleBottomScroll);
    content.addEventListener("scroll", handleContentScroll);

    // Use ResizeObserver to update when content size changes
    const resizeObserver = new ResizeObserver(() => {
      updateScrollbarWidths();
    });
    resizeObserver.observe(content);
    
    // Also observe children that might change size
    const observeChildren = () => {
      content.childNodes.forEach((child) => {
        if (child instanceof HTMLElement) {
          resizeObserver.observe(child);
        }
      });
    };
    observeChildren();

    // Use MutationObserver to detect content changes
    const mutationObserver = new MutationObserver(() => {
      updateScrollbarWidths();
    });
    mutationObserver.observe(content, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Initial setup - use multiple attempts to ensure content is measured
    updateScrollbarWidths();
    setTimeout(updateScrollbarWidths, 0);
    setTimeout(updateScrollbarWidths, 100);

    return () => {
      topScroll.removeEventListener("scroll", handleTopScroll);
      bottomScroll.removeEventListener("scroll", handleBottomScroll);
      content.removeEventListener("scroll", handleContentScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return (
    <div className={`dual-scroll-container ${className}`}>
      {/* Top scrollbar */}
      <div className="dual-scroll-top" ref={topScrollRef}>
        <div className="dual-scroll-spacer" ref={topSpacerRef} />
      </div>
      {/* Content area */}
      <div className="dual-scroll-content" ref={contentRef}>
        {children}
      </div>
      {/* Bottom scrollbar */}
      <div className="dual-scroll-bottom" ref={bottomScrollRef}>
        <div className="dual-scroll-spacer" ref={bottomSpacerRef} />
      </div>
    </div>
  );
};

