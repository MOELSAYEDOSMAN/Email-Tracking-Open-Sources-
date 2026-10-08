using EmailTracking.API.Service;
using EmailTracking.API.VM;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EmailTracking.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MailController(MailService mailService) : ControllerBase
    {
        [HttpPost("AddMail")]
        public async Task<IActionResult> AddNewMail(AddMailVM mail)
        {
            return Ok(await mailService.CreateMail(mail));
        }

        [HttpGet("Read/{mailId}")]
        public async Task<IActionResult> UpdateReadStatus(string mailId)
        {
            await mailService.UpdateReadStatus(mailId);
            return File(
          TrackingPixel,
          "image/gif");
        }

        private static readonly byte[] TrackingPixel =
        [
            0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
        0x01, 0x00, 0x01, 0x00,
        0x80, 0x00, 0x00,
        0x00, 0x00, 0x00,
        0xFF, 0xFF, 0xFF,
        0x21, 0xF9, 0x04, 0x01,
        0x00, 0x00, 0x00, 0x00,
        0x2C, 0x00, 0x00, 0x00,
        0x00, 0x01, 0x00, 0x01,
        0x00, 0x00, 0x02, 0x02,
        0x44, 0x01, 0x00, 0x3B
        ];
    }
}
