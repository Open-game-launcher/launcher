#[macro_export]
macro_rules! throttle {
    (|$($arg:ident : $type:ty),*| $body:expr, $interval:expr) => {{
        let mut last = std::time::Instant::now();
        move |$($arg: $type),*| {
            let now = std::time::Instant::now();
            if now.duration_since(last) >= $interval {
                $body;
                last = now;
            }
        }
    }};

    (|| $body:expr, $interval:expr) => {{
        let mut last = std::time::Instant::now();
        move || {
            let now = std::time::Instant::now();
            if now.duration_since(last) >= $interval {
                $body;
                last = now;
            }
        }
    }};
}
