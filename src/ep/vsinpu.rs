#![allow(deprecated)]

use super::{ExecutionProvider, RegisterError};
use crate::{error::Result, session::builder::SessionBuilder};

#[derive(Debug, Default, Clone)]
pub struct VSINPU;

super::impl_ep!(VSINPU);

impl ExecutionProvider for VSINPU {
	fn name(&self) -> &'static str {
		"VSINPUExecutionProvider"
	}

	fn supported_by_platform(&self) -> bool {
		true // no idea
	}

	#[allow(unused, unreachable_code)]
	fn register(&self, session_builder: &mut SessionBuilder) -> Result<(), RegisterError> {
		#[cfg(any(feature = "load-dynamic", feature = "vsinpu"))]
		{
			use crate::AsPointer;

			super::define_ep_register!(OrtSessionOptionsAppendExecutionProvider_VSINPU(options: *mut ort_sys::OrtSessionOptions) -> ort_sys::OrtStatusPtr);
			return Ok(unsafe { crate::error::Error::result_from_status(OrtSessionOptionsAppendExecutionProvider_VSINPU(session_builder.ptr_mut())) }?);
		}

		Err(RegisterError::MissingFeature)
	}
}
